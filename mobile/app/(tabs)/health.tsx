import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useHealthLogs } from '../../src/hooks/useHealthLogs';
import { usePatientContext } from '../../src/context/PatientContext';

const HEALTH_TYPES = ['blood_sugar', 'blood_pressure', 'weight', 'heart_rate', 'spo2'] as const;

export default function HealthScreen() {
    const router = useRouter();
    const { activePatientId } = usePatientContext();
    const [selectedType, setSelectedType] = useState<string | undefined>(undefined);
    const { data: logs, isLoading, isError, refetch } = useHealthLogs(activePatientId, selectedType);

    if (!activePatientId) {
        return (
            <View style={styles.center}>
                <Ionicons name="person-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>No patient selected</Text>
                <Text style={styles.emptySubtext}>Go to Patients tab and select one</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Type filter row */}
            <View style={styles.filterRow}>
                <TouchableOpacity
                    style={[styles.filterChip, !selectedType && styles.activeChip]}
                    onPress={() => setSelectedType(undefined)}
                >
                    <Text style={[styles.chipText, !selectedType && styles.activeChipText]}>All</Text>
                </TouchableOpacity>
                {HEALTH_TYPES.map((t) => (
                    <TouchableOpacity
                        key={t}
                        style={[styles.filterChip, selectedType === t && styles.activeChip]}
                        onPress={() => setSelectedType(t)}
                    >
                        <Text style={[styles.chipText, selectedType === t && styles.activeChipText]}>
                            {t.replace('_', ' ')}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {isLoading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#4F46E5" /></View>
            ) : isError ? (
                <View style={styles.center}>
                    <Text style={styles.errorText}>Failed to load health logs</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (!logs || logs.length === 0) ? (
                <View style={styles.center}>
                    <Ionicons name="heart-outline" size={64} color="#D1D5DB" />
                    <Text style={styles.emptyText}>No health logs yet</Text>
                    <Text style={styles.emptySubtext}>Start logging health metrics</Text>
                </View>
            ) : (
                <FlatList
                    data={logs}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={{ padding: 16 }}
                    renderItem={({ item }) => (
                        <View style={styles.logCard}>
                            <View style={styles.logHeader}>
                                <Text style={styles.logType}>{item.type.replace('_', ' ').toUpperCase()}</Text>
                                <Text style={styles.logDate}>{new Date(item.recordedAt).toLocaleDateString()}</Text>
                            </View>
                            <Text style={styles.logValue}>{item.value} <Text style={styles.logUnit}>{item.unit}</Text></Text>
                            {item.notes && <Text style={styles.logNotes}>{item.notes}</Text>}
                        </View>
                    )}
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={() => router.push('/health/add')}>
                <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
    filterChip: {
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
        backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
    },
    activeChip: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
    chipText: { fontSize: 12, color: '#6B7280', textTransform: 'capitalize' },
    activeChipText: { color: '#fff' },
    logCard: {
        backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10,
        borderWidth: 1, borderColor: '#E5E7EB',
    },
    logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    logType: { fontSize: 12, fontWeight: '600', color: '#4F46E5' },
    logDate: { fontSize: 12, color: '#9CA3AF' },
    logValue: { fontSize: 24, fontWeight: '700', color: '#111827' },
    logUnit: { fontSize: 14, fontWeight: '400', color: '#6B7280' },
    logNotes: { fontSize: 13, color: '#6B7280', marginTop: 4 },
    emptyText: { fontSize: 18, fontWeight: '600', color: '#6B7280', marginTop: 12 },
    emptySubtext: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
    errorText: { fontSize: 16, color: '#EF4444', marginBottom: 12 },
    retryButton: { backgroundColor: '#4F46E5', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
    retryText: { color: '#fff', fontWeight: '600' },
    fab: {
        position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28,
        backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', elevation: 4,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
    },
});
