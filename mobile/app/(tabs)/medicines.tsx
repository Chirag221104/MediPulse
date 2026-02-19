import React from 'react';
import { View, Text, SectionList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMedicines } from '../../src/hooks/useMedicines';
import { useLogDose } from '../../src/hooks/useDoseLogs';
import { useDiseases } from '../../src/hooks/useDiseases';
import { usePatientContext } from '../../src/context/PatientContext';
import { Medicine } from '../../src/services/medicine.service';
import { Disease } from '../../src/services/disease.service';

const LOW_STOCK_THRESHOLD = 5;

export default function MedicinesScreen() {
    const router = useRouter();
    const { activePatientId } = usePatientContext();
    const { data: medicines, isLoading: medsLoading, isError: medsError, refetch: refetchMeds } = useMedicines(activePatientId);
    const { diseases, isLoading: diseasesLoading, isError: diseasesError, refetch: refetchDiseases, migrate, isMigrating } = useDiseases(activePatientId ?? undefined);
    const logDose = useLogDose();

    const handleMarkDose = (med: Medicine, status: 'taken' | 'skipped', slot: 'morning' | 'afternoon' | 'evening') => {
        logDose.mutate({
            medicineId: med._id,
            patientId: med.patientId,
            status,
            slot,
            scheduledFor: new Date().toISOString(),
            ...(status === 'taken' ? { takenAt: new Date().toISOString() } : {}),
        });
    };

    const handleMigrate = async () => {
        try {
            await migrate();
            Alert.alert('Success', 'Medicines migrated to treatment courses');
            refetchMeds();
            refetchDiseases();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Migration failed');
        }
    };

    if (!activePatientId) {
        return (
            <View style={styles.center}>
                <Ionicons name="person-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>No patient selected</Text>
                <Text style={styles.emptySubtext}>Go to Patients tab and select one</Text>
            </View>
        );
    }

    const isLoading = medsLoading || diseasesLoading;
    if (isLoading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#4F46E5" /></View>;
    }

    const isError = medsError || diseasesError;
    if (isError) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>Failed to load treatments</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => { refetchMeds(); refetchDiseases(); }}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Migration Check: Standalone medicines
    const standaloneMedicines = medicines?.filter(m => !m.diseaseId) || [];
    const hasStandalone = standaloneMedicines.length > 0;

    // Grouping logic
    const sections = diseases.map(d => ({
        title: d.name,
        disease: d,
        data: medicines?.filter(m => m.diseaseId === d._id) || []
    })).filter(s => s.data.length > 0 || s.disease.isActive); // Show active empty diseases or non-empty ones

    // Add standalone section if any
    if (hasStandalone) {
        sections.push({
            title: 'Legacy Medicines',
            disease: { name: 'Legacy Medicines', type: 'regular', status: 'active' } as any,
            data: standaloneMedicines
        });
    }

    const renderDiseaseHeader = (disease: Disease) => {
        if (!disease._id && !hasStandalone) return null; // Safety

        const isLegacy = !disease._id;
        const isNormal = disease.type === 'normal';
        const meds = medicines?.filter(m => m.diseaseId === disease._id) || [];

        // Adherence Calculation (only for normal courses)
        let progress = 0;
        if (isNormal && meds.length > 0) {
            const total = meds.reduce((acc, m) => acc + (m.totalQuantityRequired || 0), 0);
            const consumed = meds.reduce((acc, m) => acc + (m.consumedQuantity || 0), 0);
            progress = total > 0 ? consumed / total : 0;
        }

        return (
            <View style={[styles.sectionHeader, disease.status === 'paused' && styles.pausedHeader]}>
                <View style={styles.headerTop}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.sectionTitle}>{disease.name}</Text>
                        <Text style={styles.sectionSubTitle}>
                            {disease.type === 'normal' ? 'Acute Course' : 'Chronic Treatment'}
                            {disease.durationInDays ? ` • ${disease.durationInDays} days` : ''}
                        </Text>
                    </View>
                    <View style={[
                        styles.statusBadge,
                        disease.status === 'completed' && styles.completedBadge,
                        disease.status === 'paused' && styles.pausedBadge
                    ]}>
                        <Text style={[
                            styles.statusText,
                            disease.status === 'completed' && styles.completedText,
                            disease.status === 'paused' && styles.pausedText
                        ]}>
                            {disease.status.toUpperCase()}
                        </Text>
                    </View>
                </View>

                {isNormal && disease.status === 'active' && (
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                        </View>
                        <Text style={styles.progressText}>{Math.round(progress * 100)}% Adherence</Text>
                    </View>
                )}

                {isLegacy && (
                    <TouchableOpacity style={styles.migrationAlert} onPress={handleMigrate} disabled={isMigrating}>
                        <Ionicons name="construct-outline" size={16} color="#4F46E5" />
                        <Text style={styles.migrationText}>
                            {isMigrating ? 'Migrating...' : 'Tap to migrate legacy medicines'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {(!medicines || medicines.length === 0) && (!diseases || diseases.length === 0) ? (
                <View style={styles.center}>
                    <Ionicons name="medkit-outline" size={64} color="#D1D5DB" />
                    <Text style={styles.emptyText}>No treatments found</Text>
                    <Text style={styles.emptySubtext}>Add a medical course for this patient</Text>
                </View>
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={{ padding: 16 }}
                    stickySectionHeadersEnabled={false}
                    renderSectionHeader={({ section: { disease } }: { section: any }) => renderDiseaseHeader(disease)}
                    renderItem={({ item }: { item: Medicine }) => (
                        <View style={[styles.card, item.diseaseId && diseases.find(d => d._id === item.diseaseId)?.status !== 'active' && styles.inactiveCard]}>
                            <View style={styles.cardHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.medName}>{item.name}</Text>
                                    <Text style={styles.medDetail}>
                                        {item.dose.strength ? `${item.dose.strength} • ` : ''}
                                        {item.dose.quantityPerDose} {item.dose.unit}
                                    </Text>
                                </View>
                                {item.stock !== undefined && (
                                    <View style={[styles.stockBadge, item.stock <= LOW_STOCK_THRESHOLD && styles.lowStockBadge]}>
                                        <Text style={[styles.stockText, item.stock <= LOW_STOCK_THRESHOLD && styles.lowStockText]}>
                                            {item.stock} left
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {item.stock !== undefined && item.stock <= LOW_STOCK_THRESHOLD && (
                                <View style={styles.warningRow}>
                                    <Ionicons name="warning" size={14} color="#F59E0B" />
                                    <Text style={styles.warningText}>Low stock! Refill soon.</Text>
                                </View>
                            )}

                            <View style={styles.slotsRow}>
                                {item.schedule.slots.map((slot) => {
                                    const isDiseaseActive = !item.diseaseId || diseases.find(d => d._id === item.diseaseId)?.status === 'active';
                                    return (
                                        <View key={slot.timeOfDay} style={styles.slotActionCard}>
                                            <Text style={styles.slotLabel}>
                                                {slot.timeOfDay.charAt(0).toUpperCase() + slot.timeOfDay.slice(1)}
                                                {slot.quantity ? ` (${slot.quantity})` : ''}
                                            </Text>
                                            <View style={styles.slotActions}>
                                                <TouchableOpacity
                                                    style={[styles.miniActionBtn, styles.miniTakenBtn, !isDiseaseActive && styles.disabledBtn]}
                                                    onPress={() => handleMarkDose(item, 'taken', slot.timeOfDay)}
                                                    disabled={logDose.isPending || !isDiseaseActive}
                                                >
                                                    <Ionicons name="checkmark" size={14} color="#fff" />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.miniActionBtn, styles.miniSkipBtn, !isDiseaseActive && styles.disabledBtn]}
                                                    onPress={() => handleMarkDose(item, 'skipped', slot.timeOfDay)}
                                                    disabled={logDose.isPending || !isDiseaseActive}
                                                >
                                                    <Ionicons name="close" size={14} color="#6B7280" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    )}
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={() => router.push('/medicines/add')}>
                <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    sectionHeader: { marginTop: 20, marginBottom: 12, backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
    pausedHeader: { opacity: 0.8, backgroundColor: '#F9FAFB' },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
    sectionSubTitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#EEF2FF' },
    statusText: { fontSize: 10, fontWeight: '800', color: '#4F46E5' },
    completedBadge: { backgroundColor: '#ECFDF5' },
    completedText: { color: '#059669' },
    pausedBadge: { backgroundColor: '#F3F4F6' },
    pausedText: { color: '#6B7280' },
    progressContainer: { marginTop: 12 },
    progressBarBg: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 3 },
    progressText: { fontSize: 11, fontWeight: '600', color: '#6B7280', marginTop: 4, textAlign: 'right' },
    migrationAlert: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    migrationText: { fontSize: 12, color: '#4F46E5', fontWeight: '600' },
    card: {
        backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: '#E5E7EB',
    },
    inactiveCard: { opacity: 0.6 },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    medName: { fontSize: 16, fontWeight: '600', color: '#111827' },
    medDetail: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    stockBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    lowStockBadge: { backgroundColor: '#FEF3C7' },
    stockText: { fontSize: 12, fontWeight: '600', color: '#374151' },
    lowStockText: { color: '#D97706' },
    warningRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
    warningText: { fontSize: 12, color: '#D97706' },
    slotsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    slotActionCard: {
        backgroundColor: '#F9FAFB', borderRadius: 8, padding: 8,
        borderWidth: 1, borderColor: '#F3F4F6', flex: 1, minWidth: '30%',
    },
    slotLabel: { fontSize: 11, fontWeight: '700', color: '#4B5563', marginBottom: 4 },
    slotActions: { flexDirection: 'row', gap: 6 },
    miniActionBtn: { padding: 4, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
    miniTakenBtn: { backgroundColor: '#10B981' },
    miniSkipBtn: { backgroundColor: '#E5E7EB' },
    disabledBtn: { backgroundColor: '#F3F4F6', opacity: 0.5 },
    fab: {
        position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28,
        backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', elevation: 4,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
    },
    emptyText: { fontSize: 18, fontWeight: '600', color: '#6B7280', marginTop: 12 },
    emptySubtext: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
    errorText: { fontSize: 16, color: '#EF4444', marginBottom: 12 },
    retryButton: { backgroundColor: '#4F46E5', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
    retryText: { color: '#fff', fontWeight: '600' },
});
