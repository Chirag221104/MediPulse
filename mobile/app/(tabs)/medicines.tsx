import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMedicines } from '../../src/hooks/useMedicines';
import { useLogDose } from '../../src/hooks/useDoseLogs';
import { usePatientContext } from '../../src/context/PatientContext';
import { Medicine } from '../../src/services/medicine.service';

const LOW_STOCK_THRESHOLD = 5;

export default function MedicinesScreen() {
    const router = useRouter();
    const { activePatientId } = usePatientContext();
    const { data: medicines, isLoading, isError, refetch } = useMedicines(activePatientId);
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

    if (!activePatientId) {
        return (
            <View style={styles.center}>
                <Ionicons name="person-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>No patient selected</Text>
                <Text style={styles.emptySubtext}>Go to Patients tab and select one</Text>
            </View>
        );
    }

    if (isLoading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#4F46E5" /></View>;
    }

    if (isError) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>Failed to load medicines</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {(!medicines || medicines.length === 0) ? (
                <View style={styles.center}>
                    <Ionicons name="medkit-outline" size={64} color="#D1D5DB" />
                    <Text style={styles.emptyText}>No medicines added</Text>
                    <Text style={styles.emptySubtext}>Add a medicine for this patient</Text>
                </View>
            ) : (
                <FlatList
                    data={medicines}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={{ padding: 16 }}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.medName}>{item.name}</Text>
                                    <Text style={styles.medDetail}>
                                        {item.dose.strength ? `${item.dose.strength} • ` : ''}
                                        {item.dose.quantityPerDose} {item.dose.unit}
                                    </Text>
                                </View>
                                <View style={[styles.stockBadge, item.stock <= LOW_STOCK_THRESHOLD && styles.lowStockBadge]}>
                                    <Text style={[styles.stockText, item.stock <= LOW_STOCK_THRESHOLD && styles.lowStockText]}>
                                        {item.stock} left
                                    </Text>
                                </View>
                            </View>

                            {item.stock <= LOW_STOCK_THRESHOLD && (
                                <View style={styles.warningRow}>
                                    <Ionicons name="warning" size={14} color="#F59E0B" />
                                    <Text style={styles.warningText}>Low stock! Refill soon.</Text>
                                </View>
                            )}

                            <View style={styles.slotsRow}>
                                {item.schedule.slots.map((slot) => (
                                    <View key={slot.timeOfDay} style={styles.slotActionCard}>
                                        <Text style={styles.slotLabel}>
                                            {slot.timeOfDay.charAt(0).toUpperCase() + slot.timeOfDay.slice(1)}
                                            {slot.quantity ? ` (${slot.quantity})` : ''}
                                        </Text>
                                        <View style={styles.slotActions}>
                                            <TouchableOpacity
                                                style={[styles.miniActionBtn, styles.miniTakenBtn]}
                                                onPress={() => handleMarkDose(item, 'taken', slot.timeOfDay)}
                                                disabled={logDose.isPending}
                                            >
                                                <Ionicons name="checkmark" size={14} color="#fff" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.miniActionBtn, styles.miniSkipBtn]}
                                                onPress={() => handleMarkDose(item, 'skipped', slot.timeOfDay)}
                                                disabled={logDose.isPending}
                                            >
                                                <Ionicons name="close" size={14} color="#6B7280" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
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
    card: {
        backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: '#E5E7EB',
    },
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
