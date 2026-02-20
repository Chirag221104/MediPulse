import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCreateMedicine, useUpdateMedicine, useMedicines } from '../../src/hooks/useMedicines';
import { useDiseases } from '../../src/hooks/useDiseases';
import { usePatients } from '../../src/hooks/usePatients';
import { usePatientContext } from '../../src/context/PatientContext';
import { Colors } from '../../src/constants/Colors';
import { useTheme } from '../../src/context/ThemeContext';
import { scheduleMedicineReminders, computeReminderTime } from '../../src/utils/notifications';

const TYPES = ['Tablet', 'Syrup', 'Injection', 'Drops', 'Cream', 'Inhaler'] as const;
const SLOTS = [
    { id: 'morning', label: 'Morning', mealKey: 'breakfast' },
    { id: 'afternoon', label: 'Afternoon', mealKey: 'lunch' },
    { id: 'evening', label: 'Evening', mealKey: 'dinner' },
] as const;

type SlotId = 'morning' | 'afternoon' | 'evening';
type MealRelation = 'before_breakfast' | 'after_breakfast' | 'before_lunch' | 'after_lunch' | 'before_dinner' | 'after_dinner';

interface FormSlot {
    timeOfDay: SlotId;
    mealRelation?: MealRelation;
    quantity?: string;
}

export default function AddMedicineScreen() {
    const router = useRouter();
    const { theme: activeTheme } = useTheme();
    const theme = Colors[activeTheme];
    const styles = getStyles(theme);

    const { diseaseId: paramDiseaseId, id: editId } = useLocalSearchParams<{ diseaseId?: string; id?: string }>();
    const { activePatientId } = usePatientContext();
    const createMedicine = useCreateMedicine();
    const updateMedicine = useUpdateMedicine();
    const { diseases, createDisease } = useDiseases(activePatientId ?? undefined);
    const { data: medicines } = useMedicines(activePatientId);
    const { data: patients } = usePatients();
    const activePatient = patients?.find(p => p._id === activePatientId);
    const mealTimings = activePatient?.mealTimings;

    const [isEditing, setIsEditing] = useState(false);

    // Form State
    const [selectedDiseaseId, setSelectedDiseaseId] = useState<string | 'new' | ''>(paramDiseaseId || '');
    const [newDiseaseName, setNewDiseaseName] = useState('');
    const [newDiseaseType, setNewDiseaseType] = useState<'normal' | 'regular'>('normal');
    const [newDiseaseDuration, setNewDiseaseDuration] = useState('7');
    const [newDiseaseStartOption, setNewDiseaseStartOption] = useState<'today' | 'tomorrow' | 'custom'>('today');
    const [newDiseaseCustomDate, setNewDiseaseCustomDate] = useState('');

    const getStartDate = () => {
        if (newDiseaseStartOption === 'tomorrow') {
            const d = new Date(); d.setDate(d.getDate() + 1);
            return d.toISOString().split('T')[0];
        }
        if (newDiseaseStartOption === 'custom' && newDiseaseCustomDate) {
            return newDiseaseCustomDate;
        }
        return new Date().toISOString().split('T')[0];
    };

    const getEndDateLabel = () => {
        if (newDiseaseType !== 'normal') return null;
        const days = parseInt(newDiseaseDuration);
        if (isNaN(days) || days <= 0) return null;
        const start = new Date(getStartDate());
        start.setDate(start.getDate() + days);
        return start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const [name, setName] = useState('');
    const [type, setType] = useState<typeof TYPES[number]>('Tablet');
    const [strength, setStrength] = useState('');
    const [quantityPerDose, setQuantityPerDose] = useState('1');
    const [unit, setUnit] = useState('tablet');
    const [slots, setSlots] = useState<FormSlot[]>([]);
    const [stock, setStock] = useState('');
    const [lowStockThreshold, setLowStockThreshold] = useState('5');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (editId && medicines) {
            const med = medicines.find(m => m._id === editId);
            if (med) {
                setIsEditing(true);
                setSelectedDiseaseId(med.diseaseId || '');
                setName(med.name);
                setType(med.type as any);
                setStrength(med.dose.strength || '');
                setQuantityPerDose(med.dose.quantityPerDose.toString());
                setUnit(med.dose.unit);
                setStock(med.stock?.toString() || '');
                setLowStockThreshold(med.lowStockThreshold.toString());
                setStartDate(med.startDate.split('T')[0]);
                setSlots(med.schedule.slots.map(s => ({
                    timeOfDay: s.timeOfDay as SlotId,
                    mealRelation: s.mealRelation as MealRelation,
                    quantity: s.quantity?.toString()
                })));
            }
        }
    }, [editId, medicines]);

    const toggleSlot = (slotId: SlotId) => {
        const exists = slots.some(s => s.timeOfDay === slotId);
        if (exists) {
            setSlots(slots.filter(s => s.timeOfDay !== slotId));
        } else {
            setSlots([...slots, { timeOfDay: slotId }]);
        }
    };

    const updateSlotRelation = (slotId: SlotId, mealKey: string, rel: 'before' | 'after') => {
        const relation = `${rel}_${mealKey} ` as MealRelation;
        setSlots(slots.map(s => s.timeOfDay === slotId ? { ...s, mealRelation: relation } : s));
    };

    const updateSlotQuantity = (slotId: SlotId, qty: string) => {
        setSlots(slots.map(s => s.timeOfDay === slotId ? { ...s, quantity: qty } : s));
    };

    const handleSubmit = async () => {
        if (!activePatientId) return Alert.alert('Error', 'No patient selected');
        if (!selectedDiseaseId && !isEditing) return Alert.alert('Error', 'Please select or create a treatment course');
        if (!name.trim() || !quantityPerDose.trim() || !unit.trim()) {
            Alert.alert('Error', 'Please fill in all required fields (*)');
            return;
        }

        let diseaseId = selectedDiseaseId;

        // Create new disease if needed
        if (selectedDiseaseId === 'new') {
            if (!newDiseaseName.trim()) return Alert.alert('Error', 'Please enter treatment name');
            try {
                const disease = await createDisease({
                    patientId: activePatientId,
                    name: newDiseaseName.trim(),
                    type: newDiseaseType,
                    durationInDays: newDiseaseType === 'normal' ? parseInt(newDiseaseDuration) : undefined,
                    startDate: getStartDate(),
                    status: 'active'
                });
                diseaseId = disease._id;
            } catch (error: any) {
                return Alert.alert('Error', 'Failed to create treatment course');
            }
        }

        const qtyNum = parseFloat(quantityPerDose);
        const stockNum = stock ? parseFloat(stock) : undefined;
        const thresholdNum = parseInt(lowStockThreshold, 10);

        if (isNaN(qtyNum) || qtyNum <= 0) return Alert.alert('Error', 'Invalid dose quantity');
        if (slots.length === 0) return Alert.alert('Error', 'Please select at least one intake time');

        const payload = {
            patientId: activePatientId,
            diseaseId: diseaseId === 'new' ? undefined : (diseaseId || undefined),
            name: name.trim(),
            type,
            dose: {
                strength: strength.trim() || undefined,
                quantityPerDose: qtyNum,
                unit: unit.trim().toLowerCase(),
            },
            schedule: {
                slots: slots.map(s => ({
                    timeOfDay: s.timeOfDay,
                    mealRelation: s.mealRelation,
                    quantity: s.quantity ? parseFloat(s.quantity) : undefined,
                    reminderTime: computeReminderTime(s, mealTimings),
                })),
            },
            stock: stockNum,
            lowStockThreshold: thresholdNum,
            startDate,
        };

        if (isEditing && editId) {
            updateMedicine.mutate({ id: editId, data: payload }, {
                onSuccess: (data) => {
                    scheduleMedicineReminders(data);
                    router.back();
                },
                onError: (error: any) => Alert.alert('Error', error.response?.data?.message || 'Failed to update medicine')
            });
        } else {
            createMedicine.mutate(payload, {
                onSuccess: (data) => {
                    scheduleMedicineReminders(data);
                    router.back();
                },
                onError: (error: any) => Alert.alert('Error', error.response?.data?.message || 'Failed to add medicine'),
            });
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
            {!isEditing && (
                <>
                    <Text style={styles.sectionTitle}>Treatment Course</Text>
                    <Text style={styles.subLabel}>Link this medication to a condition</Text>

                    <View style={styles.chipRow}>
                        {paramDiseaseId ? (
                            diseases.filter(d => d._id === paramDiseaseId).map((d) => (
                                <View key={d._id} style={[styles.chip, styles.activeChip]}>
                                    <Text style={[styles.chipText, styles.activeChipText]}>{d.name}</Text>
                                </View>
                            ))
                        ) : (
                            <>
                                {diseases.filter(d => d.status === 'active').map((d) => (
                                    <TouchableOpacity key={d._id} style={[styles.chip, selectedDiseaseId === d._id && styles.activeChip]} onPress={() => setSelectedDiseaseId(d._id)}>
                                        <Text style={[styles.chipText, selectedDiseaseId === d._id && styles.activeChipText]}>{d.name}</Text>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity style={[styles.chip, selectedDiseaseId === 'new' && styles.activeChip]} onPress={() => setSelectedDiseaseId('new')}>
                                    <Ionicons name="add" size={14} color={selectedDiseaseId === 'new' ? '#fff' : theme.textSecondary} />
                                    <Text style={[styles.chipText, selectedDiseaseId === 'new' && styles.activeChipText]}>New Treatment</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>

                    {selectedDiseaseId === 'new' && (
                        <View style={[styles.newDiseaseForm, { borderColor: theme.primary }]}>
                            <Text style={styles.label}>Treatment Name *</Text>
                            <TextInput style={styles.input} value={newDiseaseName} onChangeText={setNewDiseaseName} placeholder="e.g. Fever, Hypertension" placeholderTextColor={theme.inactive} />

                            <Text style={styles.label}>Treatment Type</Text>
                            <View style={styles.chipRow}>
                                <TouchableOpacity style={[styles.chip, newDiseaseType === 'normal' && styles.activeChip]} onPress={() => setNewDiseaseType('normal')}>
                                    <Text style={[styles.chipText, newDiseaseType === 'normal' && styles.activeChipText]}>Acute (Temporary)</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.chip, newDiseaseType === 'regular' && styles.activeChip]} onPress={() => setNewDiseaseType('regular')}>
                                    <Text style={[styles.chipText, newDiseaseType === 'regular' && styles.activeChipText]}>Chronic (Ongoing)</Text>
                                </TouchableOpacity>
                            </View>

                            {newDiseaseType === 'normal' && (
                                <>
                                    <Text style={styles.label}>Start Date *</Text>
                                    <View style={styles.chipRow}>
                                        <TouchableOpacity style={[styles.chip, newDiseaseStartOption === 'today' && styles.activeChip]} onPress={() => setNewDiseaseStartOption('today')}>
                                            <Text style={[styles.chipText, newDiseaseStartOption === 'today' && styles.activeChipText]}>Today</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.chip, newDiseaseStartOption === 'tomorrow' && styles.activeChip]} onPress={() => setNewDiseaseStartOption('tomorrow')}>
                                            <Text style={[styles.chipText, newDiseaseStartOption === 'tomorrow' && styles.activeChipText]}>Tomorrow</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.chip, newDiseaseStartOption === 'custom' && styles.activeChip]} onPress={() => setNewDiseaseStartOption('custom')}>
                                            <Ionicons name="calendar" size={14} color={newDiseaseStartOption === 'custom' ? '#fff' : theme.textSecondary} />
                                            <Text style={[styles.chipText, newDiseaseStartOption === 'custom' && styles.activeChipText]}>Custom</Text>
                                        </TouchableOpacity>
                                    </View>
                                    {newDiseaseStartOption === 'custom' && (
                                        <TextInput
                                            style={styles.input}
                                            value={newDiseaseCustomDate}
                                            onChangeText={setNewDiseaseCustomDate}
                                            placeholder="YYYY-MM-DD"
                                            placeholderTextColor={theme.inactive}
                                        />
                                    )}

                                    <Text style={styles.label}>Duration (Days) *</Text>
                                    <TextInput style={styles.input} value={newDiseaseDuration} onChangeText={setNewDiseaseDuration} placeholder="7" keyboardType="numeric" placeholderTextColor={theme.inactive} />

                                    {getEndDateLabel() && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
                                            <Ionicons name="calendar-outline" size={14} color={theme.primary} />
                                            <Text style={{ fontSize: 13, color: theme.primary, fontWeight: '600' }}>
                                                Ends: {getEndDateLabel()}
                                            </Text>
                                        </View>
                                    )}
                                </>
                            )}
                        </View>
                    )}
                </>
            )}

            <Text style={styles.sectionTitle}>{isEditing ? 'Editing Medication' : 'Medicine Information'}</Text>

            <Text style={styles.label}>Medicine Name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Paracetamol" placeholderTextColor={theme.inactive} />

            <Text style={styles.label}>Medicine Type</Text>
            <View style={styles.chipRow}>
                {TYPES.map((t) => (
                    <TouchableOpacity key={t} style={[styles.chip, type === t && styles.activeChip]} onPress={() => {
                        setType(t);
                        if (t === 'Tablet') setUnit('tablet');
                        else if (t === 'Syrup') setUnit('ml');
                        else if (t === 'Drops') setUnit('drops');
                    }}>
                        <Text style={[styles.chipText, type === t && styles.activeChipText]}>{t}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.label}>Strength (Optional)</Text>
                    <TextInput style={styles.input} value={strength} onChangeText={setStrength} placeholder="e.g. 500mg" placeholderTextColor={theme.inactive} />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.label}>Default Qty *</Text>
                    <TextInput style={styles.input} value={quantityPerDose} onChangeText={setQuantityPerDose} placeholder="1" keyboardType="numeric" placeholderTextColor={theme.inactive} />
                </View>
            </View>

            <Text style={styles.label}>Unit *</Text>
            <TextInput style={styles.input} value={unit} onChangeText={setUnit} placeholder="tablet, ml, drops..." placeholderTextColor={theme.inactive} />

            <Text style={styles.sectionTitle}>Intake Schedule</Text>
            <Text style={styles.subLabel}>When should this be taken?</Text>

            {SLOTS.map((slot) => {
                const isSelected = slots.some(s => s.timeOfDay === slot.id);
                const currentFormSlot = slots.find(s => s.timeOfDay === slot.id);

                return (
                    <View key={slot.id} style={[styles.slotCard, isSelected && styles.activeSlotCard]}>
                        <TouchableOpacity style={styles.slotHeader} onPress={() => toggleSlot(slot.id)}>
                            <View style={styles.slotHeaderLeft}>
                                <View style={[styles.checkbox, isSelected && styles.checkedBox]}>
                                    {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                                </View>
                                <Text style={[styles.slotLabel, isSelected && styles.activeSlotLabel]}>{slot.label}</Text>
                            </View>
                        </TouchableOpacity>

                        {isSelected && (
                            <View style={[styles.slotDetails, { borderTopColor: theme.border }]}>
                                <Text style={styles.innerLabel}>Relation to {slot.mealKey}</Text>
                                <View style={styles.relRow}>
                                    {['before', 'after'].map((rel) => {
                                        const relValue = `${rel}_${slot.mealKey} `;
                                        const isActive = currentFormSlot?.mealRelation === relValue;
                                        return (
                                            <TouchableOpacity
                                                key={rel}
                                                style={[styles.relChip, isActive && styles.activeRelChip]}
                                                onPress={() => updateSlotRelation(slot.id, slot.mealKey, rel as any)}
                                            >
                                                <Text style={[styles.relText, isActive && styles.activeRelText]}>
                                                    {rel.charAt(0).toUpperCase() + rel.slice(1)} {slot.mealKey}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                <Text style={styles.innerLabel}>Qty Override (Optional)</Text>
                                <TextInput
                                    style={styles.miniInput}
                                    value={currentFormSlot?.quantity || ''}
                                    onChangeText={(text) => updateSlotQuantity(slot.id, text)}
                                    placeholder="Leave empty for default"
                                    keyboardType="numeric"
                                    placeholderTextColor={theme.inactive}
                                />
                            </View>
                        )}
                    </View>
                );
            })}

            {(!isEditing || (isEditing && medicines?.find(m => m._id === editId)?.diseaseId && diseases.find(d => d._id === medicines.find(m => m._id === editId)?.diseaseId)?.type === 'regular')) && (
                <>
                    <Text style={styles.sectionTitle}>Inventory</Text>
                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.label}>Current Stock *</Text>
                            <TextInput style={styles.input} value={stock} onChangeText={setStock} placeholder="Total units" keyboardType="numeric" placeholderTextColor={theme.inactive} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.label}>Low Alert At</Text>
                            <TextInput style={styles.input} value={lowStockThreshold} onChangeText={setLowStockThreshold} placeholder="5" keyboardType="numeric" placeholderTextColor={theme.inactive} />
                        </View>
                    </View>
                </>
            )}

            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: theme.primary }]} onPress={handleSubmit} disabled={createMedicine.isPending || updateMedicine.isPending}>
                {(createMedicine.isPending || updateMedicine.isPending) ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{isEditing ? 'Update Medicine' : 'Save Medicine'}</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
}

function getStyles(theme: any) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.background },
        sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.text, marginTop: 24, marginBottom: 8 },
        label: { fontSize: 14, fontWeight: '600', color: theme.textSecondary, marginBottom: 6, marginTop: 12 },
        subLabel: { fontSize: 12, color: theme.inactive, marginBottom: 16 },
        innerLabel: { fontSize: 11, fontWeight: '700', color: theme.inactive, textTransform: 'uppercase', marginBottom: 8, marginTop: 8 },
        input: {
            backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 12,
            paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.text,
        },
        miniInput: {
            backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 8,
            paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: theme.text,
        },
        row: { flexDirection: 'row' },
        chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
        chip: {
            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
            backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border,
        },
        activeChip: { backgroundColor: theme.primary, borderColor: theme.primary },
        chipText: { fontSize: 13, color: theme.textSecondary },
        activeChipText: { color: '#fff', fontWeight: '600' },
        slotCard: {
            backgroundColor: theme.card, borderRadius: 16, marginBottom: 10,
            borderWidth: 1, borderColor: theme.border, overflow: 'hidden'
        },
        activeSlotCard: { borderColor: theme.primary, backgroundColor: theme.primarySurface },
        slotHeader: { padding: 16 },
        slotHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
        checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
        checkedBox: { backgroundColor: theme.primary, borderColor: theme.primary },
        slotLabel: { fontSize: 16, fontWeight: '600', color: theme.text },
        activeSlotLabel: { color: theme.primary },
        slotDetails: { padding: 16, paddingTop: 0, borderTopWidth: 1 },
        relRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
        relChip: {
            flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8,
            backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border
        },
        activeRelChip: { backgroundColor: theme.primarySurface, borderColor: theme.primary },
        relText: { fontSize: 12, color: theme.textSecondary },
        activeRelText: { color: theme.primary, fontWeight: '600' },
        submitBtn: {
            borderRadius: 16, paddingVertical: 18,
            alignItems: 'center', marginTop: 32, marginBottom: 40,
            shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
        },
        submitText: { color: '#fff', fontSize: 17, fontWeight: '700' },
        newDiseaseForm: {
            backgroundColor: theme.card, borderRadius: 16, padding: 16, marginTop: 8,
            borderWidth: 1, borderStyle: 'dashed'
        },
    });
}
