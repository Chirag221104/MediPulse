import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdherence, useHealthSummary } from '../../src/hooks/useReports';
import { usePatientContext } from '../../src/context/PatientContext';
import { reportService } from '../../src/services/report.service';

export default function ReportsScreen() {
    const { activePatientId } = usePatientContext();
    const [downloading, setDownloading] = useState(false);

    // Default: last 30 days
    const { startDate, endDate } = useMemo(() => {
        const end = new Date().toISOString();
        const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        return { startDate: start, endDate: end };
    }, []);

    const { data: adherence, isLoading: adherenceLoading, isError: adherenceError, refetch: refetchAdherence } = useAdherence(activePatientId, startDate, endDate);
    const { data: healthSummary, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary } = useHealthSummary(activePatientId, startDate, endDate);

    console.log('ReportsScreen: activePatientId =', activePatientId);
    console.log('ReportsScreen: adherenceLoading =', adherenceLoading, 'summaryLoading =', summaryLoading);
    if (adherenceError) console.log('ReportsScreen: adherenceError =', adherenceError);
    if (summaryError) console.log('ReportsScreen: summaryError =', summaryError);

    const handleDownloadPdf = async () => {
        if (!activePatientId) return;
        setDownloading(true);
        try {
            await reportService.downloadPdf(activePatientId, startDate, endDate);
        } catch (error: any) {
            Alert.alert('Download Failed', error.message || 'Could not download report');
        } finally {
            setDownloading(false);
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

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
            <Text style={styles.period}>Last 30 Days</Text>

            {/* ADHERENCE SECTION */}
            <Text style={styles.sectionTitle}>Medication Adherence</Text>
            {adherenceLoading ? (
                <ActivityIndicator size="small" color="#4F46E5" style={{ marginVertical: 20 }} />
            ) : adherenceError ? (
                <View style={styles.errorBox}>
                    <Text style={styles.errorText}>Failed to load adherence</Text>
                    <TouchableOpacity onPress={() => refetchAdherence()}>
                        <Text style={styles.retryLink}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : adherence ? (
                <View style={styles.card}>
                    <View style={styles.statRow}>
                        <StatBox label="Total" value={adherence.total} color="#6B7280" />
                        <StatBox label="Taken" value={adherence.taken} color="#10B981" />
                        <StatBox label="Skipped" value={adherence.skipped} color="#F59E0B" />
                        <StatBox label="Missed" value={adherence.missed} color="#EF4444" />
                    </View>
                    <View style={styles.adherenceRow}>
                        <Text style={styles.adherenceLabel}>Adherence Rate</Text>
                        <Text style={[
                            styles.adherenceValue,
                            { color: adherence.adherencePercentage >= 80 ? '#10B981' : adherence.adherencePercentage >= 50 ? '#F59E0B' : '#EF4444' },
                        ]}>
                            {adherence.adherencePercentage.toFixed(1)}%
                        </Text>
                    </View>
                </View>
            ) : null}

            {/* HEALTH SUMMARY SECTION */}
            <Text style={styles.sectionTitle}>Health Vitals Summary</Text>
            {summaryLoading ? (
                <ActivityIndicator size="small" color="#4F46E5" style={{ marginVertical: 20 }} />
            ) : summaryError ? (
                <View style={styles.errorBox}>
                    <Text style={styles.errorText}>Failed to load health summary</Text>
                    <TouchableOpacity onPress={() => refetchSummary()}>
                        <Text style={styles.retryLink}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : healthSummary && healthSummary.length > 0 ? (
                healthSummary.map((item) => (
                    <View key={item.type} style={styles.card}>
                        <Text style={styles.summaryType}>{item.type.replace('_', ' ').toUpperCase()}</Text>
                        <View style={styles.statRow}>
                            <StatBox label="Avg" value={item.avg} color="#4F46E5" />
                            <StatBox label="Min" value={item.min} color="#10B981" />
                            <StatBox label="Max" value={item.max} color="#EF4444" />
                            <StatBox label="Count" value={item.count} color="#6B7280" />
                        </View>
                    </View>
                ))
            ) : (
                <View style={styles.card}>
                    <Text style={styles.emptyCardText}>No health data for this period</Text>
                </View>
            )}

            {/* PDF DOWNLOAD */}
            <TouchableOpacity style={styles.pdfButton} onPress={handleDownloadPdf} disabled={downloading}>
                {downloading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <>
                        <Ionicons name="download-outline" size={20} color="#fff" />
                        <Text style={styles.pdfButtonText}> Download PDF Report</Text>
                    </>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <View style={statStyles.box}>
            <Text style={[statStyles.value, { color }]}>{value}</Text>
            <Text style={statStyles.label}>{label}</Text>
        </View>
    );
}

const statStyles = StyleSheet.create({
    box: { alignItems: 'center', flex: 1 },
    value: { fontSize: 22, fontWeight: '700' },
    label: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    period: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 16, marginBottom: 8 },
    card: {
        backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: '#E5E7EB',
    },
    statRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
    adherenceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
    adherenceLabel: { fontSize: 14, color: '#6B7280' },
    adherenceValue: { fontSize: 24, fontWeight: '700' },
    summaryType: { fontSize: 14, fontWeight: '600', color: '#4F46E5', marginBottom: 8 },
    emptyText: { fontSize: 18, fontWeight: '600', color: '#6B7280', marginTop: 12 },
    emptySubtext: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
    emptyCardText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
    errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    errorText: { fontSize: 14, color: '#EF4444' },
    retryLink: { fontSize: 14, color: '#4F46E5', fontWeight: '600' },
    pdfButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 16, marginTop: 16, marginBottom: 32,
    },
    pdfButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
