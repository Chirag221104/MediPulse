import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl, LayoutAnimation, Platform, UIManager, Modal, TextInput } from 'react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useMedicines, useDeleteMedicine } from '../../src/hooks/useMedicines';
import { useLogDose, useTodayDoseLogs } from '../../src/hooks/useDoseLogs';
import { useDiseases } from '../../src/hooks/useDiseases';
import { usePatientContext } from '../../src/context/PatientContext';
import { Medicine, medicineService } from '../../src/services/medicine.service';
import { Disease } from '../../src/services/disease.service';
import { useQuery } from '@tanstack/react-query';
import { patientService } from '../../src/services/patient.service';
import { useUpdatePatient } from '../../src/hooks/usePatients';
import { scheduleTestNotification, scheduleMedicineReminders, computeReminderTime } from '../../src/utils/notifications';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const LOW_STOCK_THRESHOLD = 5;

const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

export default function MedicinesScreen() {
    const router = useRouter();
    const { theme: activeTheme } = useTheme();
    const theme = Colors[activeTheme];
    const styles = getStyles(theme);

    const { activePatientId } = usePatientContext();
    const { data: medicines, isLoading: medsLoading, isError: medsError, refetch: refetchMeds } = useMedicines(activePatientId);
    const { diseases, isLoading: diseasesLoading, isError: diseasesError, refetch: refetchDiseases, updateDisease, deleteDisease } = useDiseases(activePatientId ?? undefined);
    const { data: todayLogs, refetch: refetchLogs } = useTodayDoseLogs(activePatientId ?? undefined);
    const logDose = useLogDose();
    const deleteMedicine = useDeleteMedicine();

    const [refreshing, setRefreshing] = useState(false);
    const [expandedDiseases, setExpandedDiseases] = useState<Set<string>>(new Set());
    const [currentTime, setCurrentTime] = useState(new Date());
    const [markingDose, setMarkingDose] = useState<string | null>(null);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [tempTimings, setTempTimings] = useState({ breakfast: '08:00', lunch: '13:00', dinner: '20:00' });

    // Disease edit modal state
    const [showDiseaseEditModal, setShowDiseaseEditModal] = useState(false);
    const [editingDisease, setEditingDisease] = useState<any>(null);
    const [editDiseaseName, setEditDiseaseName] = useState('');
    const [editDiseaseType, setEditDiseaseType] = useState<'normal' | 'regular'>('normal');
    const [editDiseaseDuration, setEditDiseaseDuration] = useState('');
    const [editDiseaseStatus, setEditDiseaseStatus] = useState<'active' | 'completed' | 'paused'>('active');
    const [editDiseaseStartDate, setEditDiseaseStartDate] = useState('');
    const [savingDisease, setSavingDisease] = useState(false);

    const { data: patients } = useQuery({ queryKey: ['patients'], queryFn: patientService.getAll });
    const activePatient = patients?.find(p => p._id === activePatientId);
    const updatePatient = useUpdatePatient();

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Force-stop recovery & Re-registration
    useEffect(() => {
        if (medicines && medicines.length > 0 && Platform.OS === 'android') {
            console.log('[Medicines] Performing alarm sync/recovery...');
            medicines.forEach(med => {
                if (med.isActive) {
                    scheduleMedicineReminders(med);
                }
            });
        }
    }, [medicines]);

    // Set temp timings when active patient changes
    useEffect(() => {
        if (activePatient?.mealTimings) {
            setTempTimings(activePatient.mealTimings);
        }
    }, [activePatient]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([refetchMeds(), refetchDiseases(), refetchLogs()]);
        setRefreshing(false);
    }, [refetchMeds, refetchDiseases, refetchLogs]);

    const toggleExpand = (id: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedDiseases(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const getMealTimeMinutes = (meal: 'breakfast' | 'lunch' | 'dinner') => {
        const timeStr = activePatient?.mealTimings?.[meal] || (meal === 'breakfast' ? '08:00' : meal === 'lunch' ? '13:00' : '20:00');
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + (m || 0);
    };

    const handleMarkDose = (med: Medicine, status: 'taken' | 'skipped' | 'missed', slot: 'morning' | 'afternoon' | 'evening') => {
        const hour = currentTime.getHours();
        const nowMinutes = hour * 60 + currentTime.getMinutes();
        const breakfastHour = parseInt(activePatient?.mealTimings?.breakfast?.split(':')[0] || '8');
        const lunchHour = parseInt(activePatient?.mealTimings?.lunch?.split(':')[0] || '13');
        const dinnerHour = parseInt(activePatient?.mealTimings?.dinner?.split(':')[0] || '20');

        let currentSlot: 'morning' | 'afternoon' | 'evening' = 'morning';
        if (hour >= lunchHour - 1 && hour < dinnerHour - 1) currentSlot = 'afternoon';
        else if (hour >= dinnerHour - 1 || hour < breakfastHour - 1) currentSlot = 'evening';

        // Slot time-window check
        if (slot !== currentSlot) {
            const actionLabel = status === 'taken' ? 'take' : status === 'skipped' ? 'skip' : 'mark as missed';
            Alert.alert(
                'Incorrect Time',
                `You are trying to ${actionLabel} a ${slot} medicine. Currently it is ${currentSlot} time. Are you sure?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Proceed', onPress: () => processDose(med, status, slot) }
                ]
            );
            return;
        }

        // Meal-relation check (Feature 1): warn if taking before/after meal at wrong time
        if (status === 'taken') {
            const slotConfig = med.schedule.slots.find(s => s.timeOfDay === slot);
            const mealRelation = slotConfig?.mealRelation;
            if (mealRelation) {
                const mealKey = slot === 'morning' ? 'breakfast' : slot === 'afternoon' ? 'lunch' : 'dinner';
                const mealMinutes = getMealTimeMinutes(mealKey);
                const mealLabel = mealKey.charAt(0).toUpperCase() + mealKey.slice(1);
                const mealTimeStr = activePatient?.mealTimings?.[mealKey] || (mealKey === 'breakfast' ? '08:00' : mealKey === 'lunch' ? '13:00' : '20:00');

                if (mealRelation.startsWith('after') && nowMinutes < mealMinutes) {
                    Alert.alert(
                        'Before Meal Time',
                        `Your ${mealLabel} is scheduled at ${mealTimeStr}. This medicine should be taken after the meal. Take it now anyway?`,
                        [
                            { text: 'Wait', style: 'cancel' },
                            { text: 'Take Now', onPress: () => processDose(med, status, slot) }
                        ]
                    );
                    return;
                }
                if (mealRelation.startsWith('before') && nowMinutes > mealMinutes) {
                    Alert.alert(
                        'After Meal Time',
                        `Your ${mealLabel} was at ${mealTimeStr}. This medicine should be taken before the meal. Take it now anyway?`,
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Take Now', onPress: () => processDose(med, status, slot) }
                        ]
                    );
                    return;
                }
            }
        }

        processDose(med, status, slot);
    };

    const processDose = (med: Medicine, status: 'taken' | 'skipped' | 'missed', slot: 'morning' | 'afternoon' | 'evening') => {
        const markId = `${med._id}-${slot}`;
        setMarkingDose(markId);
        logDose.mutate({
            medicineId: med._id,
            patientId: med.patientId,
            status,
            slot,
            scheduledFor: new Date().toISOString()
        }, {
            onSuccess: () => {
                setMarkingDose(null);
                refetchLogs();
                refetchMeds();
            },
            onError: (error: any) => {
                setMarkingDose(null);
                Alert.alert('Error', error.response?.data?.message || 'Failed to log dose');
            }
        });
    };

    // Feature 3: Auto-mark expired slots as missed
    useEffect(() => {
        if (!medicines || !todayLogs || !activePatientId) return;
        const hour = currentTime.getHours();
        const lunchHour = parseInt(activePatient?.mealTimings?.lunch?.split(':')[0] || '13');
        const dinnerHour = parseInt(activePatient?.mealTimings?.dinner?.split(':')[0] || '20');

        medicines.forEach(med => {
            med.schedule.slots.forEach(slot => {
                const isLogged = todayLogs.some(log => log.medicineId === med._id && log.slot === slot.timeOfDay);
                if (isLogged) return;

                let isExpired = false;
                if (slot.timeOfDay === 'morning' && hour >= lunchHour) isExpired = true;
                else if (slot.timeOfDay === 'afternoon' && hour >= dinnerHour) isExpired = true;
                // Evening expires at midnight (handled by date change)

                if (isExpired) {
                    processDose(med, 'missed', slot.timeOfDay as 'morning' | 'afternoon' | 'evening');
                }
            });
        });
    }, [medicines, todayLogs, activePatientId]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleUpdateTimings = () => {
        if (!activePatientId) return;
        updatePatient.mutate({
            id: activePatientId,
            payload: { mealTimings: tempTimings }
        }, {
            onSuccess: async () => {
                // Persist recomputed reminderTimes to DB, then re-schedule notifications
                if (medicines) {
                    const activeMeds = medicines.filter(m => m.isActive);
                    for (const med of activeMeds) {
                        const updatedSlots = med.schedule.slots.map(s => ({
                            ...s,
                            reminderTime: s.mealRelation
                                ? computeReminderTime(s, tempTimings)
                                : s.reminderTime, // keep existing time if no meal relation
                        }));

                        try {
                            // 1. Persist to DB
                            await medicineService.update(med._id, {
                                schedule: { slots: updatedSlots },
                            });
                            // 2. Cancel old + schedule new notifications
                            scheduleMedicineReminders({
                                ...med,
                                schedule: { slots: updatedSlots },
                            });
                        } catch (e) {
                            console.warn(`Failed to update reminders for ${med.name}:`, e);
                        }
                    }
                }
                setShowSettingsModal(false);
                Alert.alert('Success', 'Meal timings & alarms updated! ✅');
            },
            onError: (error: any) => {
                Alert.alert('Error', error.response?.data?.message || 'Failed to update timings');
            }
        });
    };

    const handleDeleteMedicine = (id: string, name: string) => {
        Alert.alert('Delete Medicine', `Are you sure you want to delete ${name}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                    deleteMedicine.mutate(id, {
                        onSuccess: () => {
                            refetchMeds();
                        },
                        onError: (error: any) => {
                            Alert.alert('Error', error.response?.data?.message || 'Failed to delete medicine');
                        }
                    });
                }
            }
        ]);
    };

    const openDiseaseEdit = (disease: any) => {
        setEditingDisease(disease);
        setEditDiseaseName(disease.name);
        setEditDiseaseType(disease.type);
        setEditDiseaseDuration(disease.durationInDays?.toString() || '');
        setEditDiseaseStatus(disease.status);
        setEditDiseaseStartDate(disease.startDate?.split('T')[0] || '');
        setShowDiseaseEditModal(true);
    };

    const handleSaveDisease = async () => {
        if (!editingDisease || !editDiseaseName.trim()) {
            Alert.alert('Error', 'Disease name is required');
            return;
        }
        setSavingDisease(true);
        try {
            await updateDisease({
                id: editingDisease._id,
                data: {
                    name: editDiseaseName.trim(),
                    type: editDiseaseType,
                    durationInDays: editDiseaseType === 'normal' ? parseInt(editDiseaseDuration) || undefined : undefined,
                    status: editDiseaseStatus,
                    startDate: editDiseaseStartDate || undefined,
                }
            });
            setShowDiseaseEditModal(false);
            refetchDiseases();
            refetchMeds();
            Alert.alert('Success', 'Treatment updated');
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to update treatment');
        } finally {
            setSavingDisease(false);
        }
    };

    const handleDeleteDisease = (disease: any) => {
        Alert.alert(
            'Delete Treatment',
            `Are you sure you want to delete "${disease.name}"? This will also delete all medicines linked to it.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteDisease(disease._id);
                            refetchDiseases();
                            refetchMeds();
                        } catch (err: any) {
                            Alert.alert('Error', err.response?.data?.message || 'Failed to delete treatment');
                        }
                    }
                }
            ]
        );
    };

    const getSmartPrompt = () => {
        const hour = currentTime.getHours();
        const breakfastHour = parseInt(activePatient?.mealTimings?.breakfast?.split(':')[0] || '8');
        const lunchHour = parseInt(activePatient?.mealTimings?.lunch?.split(':')[0] || '13');
        const dinnerHour = parseInt(activePatient?.mealTimings?.dinner?.split(':')[0] || '20');

        let slot: 'morning' | 'afternoon' | 'evening' = 'morning';
        let label = 'Morning';
        if (hour >= lunchHour - 1 && hour < dinnerHour - 1) { slot = 'afternoon'; label = 'Afternoon'; }
        else if (hour >= dinnerHour - 1 || hour < breakfastHour - 1) { slot = 'evening'; label = 'Evening'; }

        const pendingMeds = medicines?.filter(med => {
            const hasSlot = med.schedule.slots.some(s => s.timeOfDay === slot);
            const isLogged = todayLogs?.some(log => log.medicineId === med._id && log.slot === slot);
            return hasSlot && !isLogged;
        }) || [];

        if (pendingMeds.length === 0) return { title: 'All Done!', sub: `You've taken all ${label} medicines.`, color: '#059669', icon: 'checkmark-circle' as const };
        return { title: `${label} Dose`, sub: `You have ${pendingMeds.length} medicine(s) to take now.`, color: '#4F46E5', icon: 'time' as const };
    };

    if (medsLoading || diseasesLoading) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    if (medsError || diseasesError) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <Text style={[styles.errorText, { color: theme.error }]}>Failed to load data</Text>
                <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const { title, sub, color, icon } = getSmartPrompt();

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
            >
                {/* Smart Prompt Section */}
                <View style={[styles.smartPromptCard, { backgroundColor: theme.primarySurface, borderColor: theme.primary }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={styles.promptHeader}>
                            <Ionicons name={icon} size={14} color={color} />
                            <Text style={[styles.promptLabel, { color }]}>{title}</Text>
                        </View>
                        <View style={{ width: 18 }} />
                    </View>
                    <Text style={[styles.promptText, { color: theme.text }]}>{sub}</Text>
                </View>

                {/* Course Sections */}
                {diseases.map((disease: any) => {
                    const meds = medicines?.filter(m => m.diseaseId === disease._id) || [];
                    const isExpanded = expandedDiseases.has(disease._id);
                    const isNormal = disease.type === 'normal';

                    const progress = isNormal ? Math.min(1, meds.reduce((acc, m) => acc + (m.consumedQuantity || 0), 0) / (meds.reduce((acc, m) => acc + (m.totalQuantityRequired || 1), 0) || 1)) : 0;

                    return (
                        <View key={disease._id} style={[styles.courseCard, disease.status === 'paused' && styles.pausedCard]}>
                            <TouchableOpacity style={styles.courseHeader} onPress={() => toggleExpand(disease._id)} activeOpacity={0.7}>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={[styles.courseTitle, { color: theme.text }]}>{disease.name}</Text>
                                        <View style={[styles.statusBadge, disease.status === 'completed' && styles.completedBadge]}>
                                            <Text style={[styles.statusText, disease.status === 'completed' && styles.completedText]}>{disease.status}</Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.courseMeta, { color: theme.textSecondary }]}>
                                        {formatDate(disease.startDate)} - {disease.endDate ? formatDate(disease.endDate) : 'Indefinite'}
                                    </Text>
                                </View>
                                <View style={styles.courseHeaderActions}>
                                    <TouchableOpacity style={styles.addMedBtn} onPress={() => openDiseaseEdit(disease)}>
                                        <Ionicons name="create-outline" size={20} color={theme.textSecondary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.addMedBtn} onPress={() => handleDeleteDisease(disease)}>
                                        <Ionicons name="trash-outline" size={20} color={theme.error || '#EF4444'} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.addMedBtn} onPress={() => router.push({ pathname: '/medicines/add', params: { diseaseId: disease._id } })}>
                                        <Ionicons name="add-circle" size={24} color={theme.primary} />
                                    </TouchableOpacity>
                                    <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={theme.inactive} />
                                </View>
                            </TouchableOpacity>

                            {isNormal && disease.status === 'active' && (
                                <View style={styles.progressSection}>
                                    <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
                                        <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: theme.accent }]} />
                                    </View>
                                </View>
                            )}

                            {isExpanded && (
                                <View style={[styles.medsContainer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
                                    {meds.length > 0 ? meds.map((item, idx) => (
                                        <View key={item._id} style={[styles.medItem, idx === meds.length - 1 && styles.noBorder, { borderBottomColor: theme.border }]}>
                                            <View style={styles.medCardHeader}>
                                                <View style={{ flex: 1 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                        <Text style={[styles.medName, { color: theme.text }]}>{item.name}</Text>
                                                        <View style={[styles.stockBadge, { backgroundColor: theme.border }, item.stock !== undefined && item.stock <= (item.lowStockThreshold || 5) && styles.lowStockBadge]}>
                                                            <Text style={[styles.stockText, { color: theme.text }, item.stock !== undefined && item.stock <= (item.lowStockThreshold || 5) && styles.lowStockText]}>
                                                                {item.stock !== undefined ? `${item.stock}` : '∞'}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <Text style={[styles.medDetail, { color: theme.textSecondary }]}>{item.type} • {item.dose.quantityPerDose} {item.dose.unit}</Text>
                                                </View>
                                                <View style={styles.medActions}>
                                                    <TouchableOpacity style={styles.actionIcon} onPress={() => router.push({ pathname: '/medicines/add', params: { id: item._id } })}>
                                                        <Ionicons name="create-outline" size={18} color={theme.primary} />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity style={styles.actionIcon} onPress={() => handleDeleteMedicine(item._id, item.name)}>
                                                        <Ionicons name="trash-outline" size={18} color={theme.error} />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>

                                            <View style={styles.slotsRow}>
                                                {item.schedule.slots.map(slot => {
                                                    const log = todayLogs?.find(l => l.medicineId === item._id && l.slot === slot.timeOfDay);
                                                    const isMarking = markingDose === `${item._id}-${slot.timeOfDay}`;

                                                    return (
                                                        <View key={slot.timeOfDay} style={[styles.slotActionCard, { backgroundColor: theme.card, borderColor: theme.border }, log && styles.loggedSlotCard]}>
                                                            <Text style={[styles.slotLabel, log && styles.loggedSlotLabel]}>{slot.timeOfDay}</Text>
                                                            {isMarking ? (
                                                                <ActivityIndicator size="small" color={theme.primary} />
                                                            ) : log ? (
                                                                <View style={styles.loggedStatus}>
                                                                    <Ionicons
                                                                        name={log.status === 'taken' ? "checkmark-circle" : log.status === 'skipped' ? "remove-circle" : "alert-circle"}
                                                                        size={16}
                                                                        color={log.status === 'taken' ? '#10B981' : log.status === 'skipped' ? '#9CA3AF' : '#EF4444'}
                                                                    />
                                                                    <Text style={[styles.loggedText, { color: log.status === 'taken' ? '#059669' : theme.textSecondary }]}>{log.status}</Text>
                                                                </View>
                                                            ) : (
                                                                <View style={styles.slotActions}>
                                                                    <TouchableOpacity style={[styles.miniActionBtn, styles.miniTakenBtn]} onPress={() => handleMarkDose(item, 'taken', slot.timeOfDay as any)}>
                                                                        <Ionicons name="checkmark" size={12} color="#fff" />
                                                                    </TouchableOpacity>
                                                                    <TouchableOpacity style={[styles.miniActionBtn, styles.miniSkipBtn, { backgroundColor: theme.border }]} onPress={() => handleMarkDose(item, 'skipped', slot.timeOfDay as any)}>
                                                                        <Ionicons name="remove" size={12} color={theme.textSecondary} />
                                                                    </TouchableOpacity>
                                                                    <TouchableOpacity style={[styles.miniActionBtn, styles.miniMissedBtn]} onPress={() => handleMarkDose(item, 'missed', slot.timeOfDay as any)}>
                                                                        <Ionicons name="alert" size={12} color="#fff" />
                                                                    </TouchableOpacity>
                                                                </View>
                                                            )}
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        </View>
                                    )) : (
                                        <Text style={[styles.noMedsText, { color: theme.inactive }]}>No medicines added yet</Text>
                                    )}
                                </View>
                            )}
                        </View>
                    );
                })}

                {diseases.length === 0 && (
                    <View style={styles.center}>
                        <Ionicons name="medical-outline" size={48} color={theme.border} />
                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No treatments active</Text>
                        <Text style={[styles.emptySubtext, { color: theme.inactive }]}>Tap the + button to add one</Text>
                    </View>
                )}
            </ScrollView>

            <TouchableOpacity style={[styles.fab, { backgroundColor: theme.primary }]} onPress={() => router.push('/medicines/add')}>
                <Ionicons name="add" size={30} color="#fff" />
            </TouchableOpacity>

            {/* Disease Edit Modal */}
            <Modal visible={showDiseaseEditModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Treatment</Text>
                        <Text style={[styles.modalSub, { color: theme.textSecondary }]}>Update course details</Text>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Name</Text>
                            <TextInput
                                style={[styles.timeInput, { backgroundColor: theme.surface, color: theme.text }]}
                                value={editDiseaseName}
                                onChangeText={setEditDiseaseName}
                                placeholder="Treatment name"
                                placeholderTextColor={theme.inactive}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Type</Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TouchableOpacity
                                    style={[styles.chipStyle, editDiseaseType === 'normal' && { backgroundColor: theme.primary }]}
                                    onPress={() => setEditDiseaseType('normal')}
                                >
                                    <Text style={{ color: editDiseaseType === 'normal' ? '#fff' : theme.text, fontSize: 13, fontWeight: '600' }}>Acute</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.chipStyle, editDiseaseType === 'regular' && { backgroundColor: theme.primary }]}
                                    onPress={() => setEditDiseaseType('regular')}
                                >
                                    <Text style={{ color: editDiseaseType === 'regular' ? '#fff' : theme.text, fontSize: 13, fontWeight: '600' }}>Chronic</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Status</Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {(['active', 'paused', 'completed'] as const).map(s => (
                                    <TouchableOpacity
                                        key={s}
                                        style={[styles.chipStyle, editDiseaseStatus === s && { backgroundColor: s === 'active' ? '#10B981' : s === 'paused' ? '#F59E0B' : '#6B7280' }]}
                                        onPress={() => setEditDiseaseStatus(s)}
                                    >
                                        <Text style={{ color: editDiseaseStatus === s ? '#fff' : theme.text, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' }}>{s}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Start Date</Text>
                                <TextInput
                                    style={[styles.timeInput, { backgroundColor: theme.surface, color: theme.text }]}
                                    value={editDiseaseStartDate}
                                    onChangeText={setEditDiseaseStartDate}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor={theme.inactive}
                                />
                            </View>
                            {editDiseaseType === 'normal' && (
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Duration (days)</Text>
                                    <TextInput
                                        style={[styles.timeInput, { backgroundColor: theme.surface, color: theme.text }]}
                                        value={editDiseaseDuration}
                                        onChangeText={setEditDiseaseDuration}
                                        placeholder="7"
                                        keyboardType="numeric"
                                        placeholderTextColor={theme.inactive}
                                    />
                                </View>
                            )}
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDiseaseEditModal(false)}>
                                <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSaveDisease} disabled={savingDisease}>
                                {savingDisease ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

function getStyles(theme: any) {
    return StyleSheet.create({
        container: { flex: 1 },
        center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
        smartPromptCard: { padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 20 },
        promptHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
        promptLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
        promptText: { fontSize: 16, fontWeight: '700' },
        settingsBtn: { padding: 4 },
        courseCard: { backgroundColor: theme.card, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
        pausedCard: { opacity: 0.7 },
        courseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
        courseHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
        addMedBtn: { padding: 4 },
        chipStyle: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
        courseTitle: { fontSize: 18, fontWeight: '700' },
        courseMeta: { fontSize: 12, marginTop: 4 },
        statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: theme.primarySurface },
        statusText: { fontSize: 10, fontWeight: '800', color: theme.primary, textTransform: 'uppercase' },
        completedBadge: { backgroundColor: '#ECFDF5' },
        completedText: { color: '#059669' },
        progressSection: { paddingHorizontal: 16, paddingBottom: 12 },
        progressBarBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
        progressBarFill: { height: '100%' },
        medsContainer: { borderTopWidth: 1 },
        medItem: { padding: 16, borderBottomWidth: 1 },
        noBorder: { borderBottomWidth: 0 },
        medCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        medName: { fontSize: 15, fontWeight: '600' },
        medDetail: { fontSize: 12, marginTop: 2 },
        medActions: { flexDirection: 'row', gap: 12 },
        actionIcon: { padding: 4 },
        stockBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
        lowStockBadge: { backgroundColor: '#FEF3C7' },
        stockText: { fontSize: 10, fontWeight: '700' },
        lowStockText: { color: '#D97706' },
        slotsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
        slotActionCard: { padding: 8, borderRadius: 10, borderWidth: 1, flex: 1 },
        slotLabel: { fontSize: 9, fontWeight: '800', color: theme.inactive, textTransform: 'uppercase', marginBottom: 6 },
        slotActions: { flexDirection: 'row', gap: 6 },
        miniActionBtn: { padding: 6, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
        miniTakenBtn: { backgroundColor: '#10B981' },
        miniSkipBtn: { backgroundColor: theme.border },
        miniMissedBtn: { backgroundColor: '#EF4444' },
        loggedSlotCard: { backgroundColor: theme.primarySurface, borderColor: theme.primary, borderStyle: 'dashed' },
        loggedSlotLabel: { color: theme.primary },
        loggedStatus: { flexDirection: 'row', alignItems: 'center', gap: 4 },
        loggedText: { fontSize: 9, fontWeight: '800' },
        modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
        modalContent: { borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
        modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
        modalSub: { fontSize: 14, marginBottom: 24 },

        inputGroup: { marginBottom: 16 },
        inputLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
        timeInput: { borderRadius: 12, padding: 12, fontSize: 16, fontWeight: '600' },
        modalActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
        cancelBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
        cancelBtnText: { fontSize: 15, fontWeight: '600' },
        saveBtn: { flex: 2, padding: 14, borderRadius: 12, alignItems: 'center' },
        saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
        noMedsText: { padding: 20, textAlign: 'center', fontSize: 12, fontStyle: 'italic' },
        emptyText: { fontSize: 16, fontWeight: '600', marginTop: 12, textAlign: 'center' },
        emptySubtext: { fontSize: 14, marginTop: 4, textAlign: 'center' },
        fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 4 },
        errorText: { fontSize: 16, marginBottom: 12 },
        retryButton: { backgroundColor: theme.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
        retryText: { color: '#fff', fontWeight: '600' },
    });
}
