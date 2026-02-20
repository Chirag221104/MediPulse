import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useHealthLogs } from '../../src/hooks/useHealthLogs';
import { usePatientContext } from '../../src/context/PatientContext';
import { Colors } from '../../src/constants/Colors';
import { useTheme } from '../../src/context/ThemeContext';

const HEALTH_TYPES = ['blood_sugar', 'blood_pressure', 'weight', 'heart_rate', 'spo2'] as const;

export default function HealthScreen() {
    const router = useRouter();
    const { theme: activeTheme } = useTheme();
    const theme = Colors[activeTheme];
    const styles = getStyles(theme);

    const { activePatientId } = usePatientContext();
    const [selectedType, setSelectedType] = useState<string | undefined>(undefined);
    const { data: logs, isLoading, isError, refetch } = useHealthLogs(activePatientId, selectedType);

    if (!activePatientId) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <Ionicons name="person-outline" size={64} color={theme.border} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No patient selected</Text>
                <Text style={[styles.emptySubtext, { color: theme.inactive }]}>Go to Patients tab and select one</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
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
                <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>
            ) : isError ? (
                <View style={[styles.center, { backgroundColor: theme.background }]}>
                    <Text style={[styles.errorText, { color: theme.error }]}>Failed to load health logs</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (!logs || logs.length === 0) ? (
                <View style={[styles.center, { backgroundColor: theme.background }]}>
                    <Ionicons name="heart-outline" size={64} color={theme.border} />
                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No health logs yet</Text>
                    <Text style={[styles.emptySubtext, { color: theme.inactive }]}>Start logging health metrics</Text>
                </View>
            ) : (
                <FlatList
                    data={logs}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={{ padding: 16 }}
                    renderItem={({ item }) => (
                        <View style={[styles.logCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <View style={styles.logHeader}>
                                <Text style={[styles.logType, { color: theme.primary }]}>{item.type.replace('_', ' ').toUpperCase()}</Text>
                                <Text style={[styles.logDate, { color: theme.inactive }]}>{new Date(item.recordedAt).toLocaleDateString()}</Text>
                            </View>
                            <Text style={[styles.logValue, { color: theme.text }]}>{item.value} <Text style={[styles.logUnit, { color: theme.textSecondary }]}>{item.unit}</Text></Text>
                            {item.notes && <Text style={[styles.logNotes, { color: theme.textSecondary }]}>{item.notes}</Text>}
                        </View>
                    )}
                />
            )}

            <TouchableOpacity style={[styles.fab, { backgroundColor: theme.primary }]} onPress={() => router.push('/health/add')}>
                <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

function getStyles(theme: any) {
    return StyleSheet.create({
        container: { flex: 1 },
        center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
        filterRow: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
        filterChip: {
            paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
            backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border,
        },
        activeChip: { backgroundColor: theme.primary, borderColor: theme.primary },
        chipText: { fontSize: 12, color: theme.textSecondary, textTransform: 'capitalize' },
        activeChipText: { color: '#fff' },
        logCard: {
            borderRadius: 12, padding: 16, marginBottom: 10,
            borderWidth: 1,
        },
        logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
        logType: { fontSize: 12, fontWeight: '600' },
        logDate: { fontSize: 12 },
        logValue: { fontSize: 24, fontWeight: '700' },
        logUnit: { fontSize: 14, fontWeight: '400' },
        logNotes: { fontSize: 13, marginTop: 4 },
        emptyText: { fontSize: 18, fontWeight: '600', marginTop: 12 },
        emptySubtext: { fontSize: 14, marginTop: 4 },
        errorText: { fontSize: 16, marginBottom: 12 },
        retryButton: { backgroundColor: theme.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
        retryText: { color: '#fff', fontWeight: '600' },
        fab: {
            position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28,
            justifyContent: 'center', alignItems: 'center', elevation: 4,
            shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
        },
    });
}
