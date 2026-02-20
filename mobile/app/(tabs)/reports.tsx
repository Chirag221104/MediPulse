import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useAdherence, useHealthSummary } from '../../src/hooks/useReports';
import { useDoseLogs } from '../../src/hooks/useDoseLogs';
import { useDiseases } from '../../src/hooks/useDiseases';
import { usePatientContext } from '../../src/context/PatientContext';
import { reportService } from '../../src/services/report.service';
import { Colors } from '../../src/constants/Colors';
import { useTheme } from '../../src/context/ThemeContext';

export default function ReportsScreen() {
    const { activePatientId } = usePatientContext();
    const { theme: activeTheme } = useTheme();
    const theme = Colors[activeTheme];
    const styles = getStyles(theme);

    const [downloading, setDownloading] = useState<string | null>(null);
    const [selectedDiseaseId, setSelectedDiseaseId] = useState<string | null>(null);

    // Month-based navigation
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() }; // 0-indexed month
    });

    const todayStr = new Date().toLocaleDateString('en-CA');

    // Compute month boundaries and day array for the selected month
    const { startDate, endDate, daysArray } = useMemo(() => {
        const { year, month } = selectedMonth;
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0); // last day of the month

        const days: string[] = [];
        for (let d = 1; d <= end.getDate(); d++) {
            const dt = new Date(year, month, d);
            days.push(dt.toLocaleDateString('en-CA'));
        }
        return { startDate: start.toISOString(), endDate: end.toISOString(), daysArray: days };
    }, [selectedMonth]);

    const monthLabel = new Date(selectedMonth.year, selectedMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const goToPrevMonth = () => {
        setSelectedMonth(prev => {
            const m = prev.month === 0 ? 11 : prev.month - 1;
            const y = prev.month === 0 ? prev.year - 1 : prev.year;
            return { year: y, month: m };
        });
    };

    const now = new Date();
    const isCurrentMonth = selectedMonth.year === now.getFullYear() && selectedMonth.month === now.getMonth();

    const goToNextMonth = () => {
        if (isCurrentMonth) return; // can't go past current month
        setSelectedMonth(prev => {
            const m = prev.month === 11 ? 0 : prev.month + 1;
            const y = prev.month === 11 ? prev.year + 1 : prev.year;
            return { year: y, month: m };
        });
    };

    const { data: adherence, isLoading: adherenceLoading, isError: adherenceError, refetch: refetchAdherence } = useAdherence(activePatientId, startDate, endDate);
    const { data: healthSummary, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary } = useHealthSummary(activePatientId, startDate, endDate);
    const { data: doseLogs, refetch: refetchLogs } = useDoseLogs(activePatientId, startDate, endDate);
    const { diseases } = useDiseases(activePatientId || undefined);

    // Group logs by date
    const groupedLogs = useMemo(() => {
        const grouped: Record<string, string[]> = {};
        if (!doseLogs) return grouped;
        doseLogs.forEach(log => {
            const day = new Date(log.scheduledFor).toLocaleDateString('en-CA');
            if (!grouped[day]) grouped[day] = [];
            grouped[day].push(log.status);
        });
        return grouped;
    }, [doseLogs]);

    const getDayStatus = (dateStr: string) => {
        // Future dates have no status
        if (dateStr > todayStr) return 'future';
        const statuses = groupedLogs[dateStr];
        if (!statuses || statuses.length === 0) return 'empty';

        const hasTaken = statuses.includes('taken');
        const hasMissed = statuses.includes('missed') || statuses.includes('skipped');

        if (hasTaken && !hasMissed) return 'green';
        if (hasTaken && hasMissed) return 'yellow';
        if (!hasTaken && hasMissed) return 'red';
        return 'empty';
    };

    const getColor = (status: string) => {
        switch (status) {
            case 'green': return '#10B981';
            case 'yellow': return '#F59E0B';
            case 'red': return '#EF4444';
            case 'future': return 'transparent';
            default: return activeTheme === 'dark' ? '#374151' : '#E5E7EB';
        }
    };

    // Refetch reports every time this tab comes into focus
    useFocusEffect(
        useCallback(() => {
            refetchAdherence();
            refetchSummary();
            refetchLogs();
        }, [refetchAdherence, refetchSummary, refetchLogs])
    );

    const handleDownload = async (diseaseId?: string) => {
        if (!activePatientId) return;
        const key = diseaseId || 'full';
        setDownloading(key);
        try {
            await reportService.downloadPdf(activePatientId, startDate, endDate, diseaseId);
        } catch (error: any) {
            Alert.alert('Download Failed', error.message || 'Could not download report');
        } finally {
            setDownloading(null);
        }
    };

    if (!activePatientId) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <Ionicons name="person-outline" size={64} color={theme.border} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No patient selected</Text>
                <Text style={[styles.emptySubtext, { color: theme.inactive }]}>Go to Patients tab and select one</Text>
            </View>
        );
    }

    // Build calendar rows
    const firstDow = new Date(selectedMonth.year, selectedMonth.month, 1).getDay();
    const calCells: (string | null)[] = Array(firstDow).fill(null).concat(daysArray);
    while (calCells.length % 7 !== 0) calCells.push(null);
    const calRows: (string | null)[][] = [];
    for (let i = 0; i < calCells.length; i += 7) calRows.push(calCells.slice(i, i + 7));

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={{ padding: 16 }}>
            {/* ADHERENCE CALENDAR */}
            <View style={[styles.calendarCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {/* Month navigation */}
                <View style={styles.monthNav}>
                    <TouchableOpacity onPress={goToPrevMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="chevron-back" size={22} color={theme.primary} />
                    </TouchableOpacity>
                    <Text style={[styles.monthTitle, { color: theme.text }]}>{monthLabel}</Text>
                    <TouchableOpacity onPress={goToNextMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="chevron-forward" size={22} color={isCurrentMonth ? theme.border : theme.primary} />
                    </TouchableOpacity>
                </View>

                {/* Day-of-week headers */}
                <View style={styles.weekRow}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                        <View key={i} style={styles.weekCell}>
                            <Text style={[styles.dayHeader, { color: theme.inactive }]}>{d}</Text>
                        </View>
                    ))}
                </View>

                {/* Calendar body */}
                {calRows.map((row, ri) => (
                    <View key={ri} style={styles.weekRow}>
                        {row.map((day, ci) => {
                            if (!day) {
                                return <View key={`e${ri}-${ci}`} style={styles.weekCell} />;
                            }
                            const status = getDayStatus(day);
                            const isToday = day === todayStr;
                            const dateNum = parseInt(day.split('-')[2], 10);
                            const isFuture = status === 'future';

                            return (
                                <View key={day} style={styles.weekCell}>
                                    <View
                                        style={[
                                            styles.calendarCircle,
                                            { backgroundColor: getColor(status) },
                                            isToday && { borderWidth: 2.5, borderColor: theme.primary },
                                            isFuture && { borderWidth: 1, borderColor: theme.border },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.dateNum,
                                                {
                                                    color: isFuture
                                                        ? theme.inactive
                                                        : status === 'empty'
                                                            ? theme.textSecondary
                                                            : '#fff',
                                                },
                                            ]}
                                        >
                                            {dateNum}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                ))}

                <View style={styles.legendRow}>
                    <LegendItem color="#10B981" label="All Taken" theme={theme} />
                    <LegendItem color="#F59E0B" label="Partial" theme={theme} />
                    <LegendItem color="#EF4444" label="Missed" theme={theme} />
                    <LegendItem color={activeTheme === 'dark' ? '#374151' : '#E5E7EB'} label="No Logs" theme={theme} />
                </View>
            </View>

            {/* ADHERENCE SECTION */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Medication Summary</Text>
            {adherenceLoading ? (
                <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 20 }} />
            ) : adherenceError ? (
                <View style={styles.errorBox}>
                    <Text style={[styles.errorText, { color: theme.error }]}>Failed to load adherence</Text>
                    <TouchableOpacity onPress={() => refetchAdherence()}>
                        <Text style={[styles.retryLink, { color: theme.primary }]}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : adherence ? (
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.statRow}>
                        <StatBox label="Total" value={adherence.total} color={theme.textSecondary} theme={theme} />
                        <StatBox label="Taken" value={adherence.taken} color="#10B981" theme={theme} />
                        <StatBox label="Skipped" value={adherence.skipped} color="#F59E0B" theme={theme} />
                        <StatBox label="Missed" value={adherence.missed} color="#EF4444" theme={theme} />
                    </View>
                    <View style={[styles.adherenceRow, { borderTopColor: theme.border }]}>
                        <Text style={[styles.adherenceLabel, { color: theme.textSecondary }]}>Adherence Rate</Text>
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
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Health Vitals Summary</Text>
            {summaryLoading ? (
                <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 20 }} />
            ) : summaryError ? (
                <View style={styles.errorBox}>
                    <Text style={[styles.errorText, { color: theme.error }]}>Failed to load health summary</Text>
                    <TouchableOpacity onPress={() => refetchSummary()}>
                        <Text style={[styles.retryLink, { color: theme.primary }]}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : healthSummary && healthSummary.length > 0 ? (
                healthSummary.map((item) => (
                    <View key={item.type} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <Text style={[styles.summaryType, { color: theme.primary }]}>{item.type.replace('_', ' ').toUpperCase()}</Text>
                        <View style={styles.statRow}>
                            <StatBox label="Avg" value={item.avg} color={theme.primary} theme={theme} />
                            <StatBox label="Min" value={item.min} color="#10B981" theme={theme} />
                            <StatBox label="Max" value={item.max} color="#EF4444" theme={theme} />
                            <StatBox label="Count" value={item.count} color={theme.textSecondary} theme={theme} />
                        </View>
                    </View>
                ))
            ) : (
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.emptyCardText, { color: theme.inactive }]}>No health data for this period</Text>
                </View>
            )}

            {/* ─── DOWNLOAD REPORTS SECTION ─── */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Download Reports</Text>

            {/* Full Report Button */}
            <TouchableOpacity
                style={[styles.pdfButton, { backgroundColor: theme.primary }]}
                onPress={() => handleDownload()}
                disabled={!!downloading}
            >
                {downloading === 'full' ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <>
                        <Ionicons name="document-text-outline" size={20} color="#fff" />
                        <Text style={styles.pdfButtonText}>  Download Full Report</Text>
                    </>
                )}
            </TouchableOpacity>

            {/* Disease-wise Reports */}
            {diseases.length > 0 && (
                <View style={styles.diseaseSection}>
                    <Text style={[styles.diseaseLabel, { color: theme.textSecondary }]}>Or download for a specific disease:</Text>
                    {diseases.map((d: any) => (
                        <TouchableOpacity
                            key={d._id}
                            style={[
                                styles.diseaseButton,
                                { backgroundColor: theme.card, borderColor: theme.border },
                                downloading === d._id && styles.diseaseButtonDisabled,
                            ]}
                            onPress={() => handleDownload(d._id)}
                            disabled={!!downloading}
                        >
                            {downloading === d._id ? (
                                <ActivityIndicator color={theme.primary} size="small" />
                            ) : (
                                <>
                                    <View style={styles.diseaseInfo}>
                                        <Ionicons name="medkit-outline" size={18} color={theme.primary} />
                                        <Text style={[styles.diseaseName, { color: theme.text }]}>{d.name}</Text>
                                    </View>
                                    <View style={[
                                        styles.statusBadge,
                                        { backgroundColor: d.status === 'active' ? '#DCFCE7' : d.status === 'completed' ? (activeTheme === 'dark' ? '#374151' : '#E5E7EB') : '#FEF3C7' },
                                    ]}>
                                        <Text style={[
                                            styles.statusText,
                                            { color: d.status === 'active' ? '#16A34A' : d.status === 'completed' ? (activeTheme === 'dark' ? '#9CA3AF' : '#6B7280') : '#D97706' },
                                        ]}>
                                            {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                                        </Text>
                                    </View>
                                </>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            <View style={{ height: 32 }} />
        </ScrollView>
    );
}

function StatBox({ label, value, color, theme }: { label: string; value: number; color: string; theme: any }) {
    return (
        <View style={statStyles.box}>
            <Text style={[statStyles.value, { color }]}>{value}</Text>
            <Text style={[statStyles.label, { color: theme.inactive }]}>{label}</Text>
        </View>
    );
}

function LegendItem({ color, label, theme }: { color: string; label: string; theme: any }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
            <Text style={{ fontSize: 10, color: theme.textSecondary, fontWeight: '500' }}>{label}</Text>
        </View>
    );
}

const statStyles = StyleSheet.create({
    box: { alignItems: 'center', flex: 1 },
    value: { fontSize: 22, fontWeight: '700' },
    label: { fontSize: 11, marginTop: 2 },
});

function getStyles(theme: any) {
    return StyleSheet.create({
        container: { flex: 1 },
        center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
        sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
        card: {
            borderRadius: 12, padding: 16, marginBottom: 12,
            borderWidth: 1,
        },
        calendarCard: {
            borderRadius: 16, padding: 14, marginBottom: 20,
            borderWidth: 1,
        },
        monthNav: {
            flexDirection: 'row' as const,
            justifyContent: 'space-between' as const,
            alignItems: 'center' as const,
            marginBottom: 14,
            paddingHorizontal: 4,
        },
        monthTitle: {
            fontSize: 17,
            fontWeight: '700' as const,
        },
        weekRow: {
            flexDirection: 'row' as const,
            marginBottom: 6,
        },
        weekCell: {
            flex: 1,
            alignItems: 'center' as const,
            paddingVertical: 3,
        },
        dayHeader: {
            fontSize: 11,
            fontWeight: '600' as const,
            marginBottom: 8,
        },
        calendarCircle: {
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
        },
        dateNum: {
            fontSize: 13,
            fontWeight: '600' as const,
        },
        legendRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: theme.border,
            flexWrap: 'wrap',
            gap: 12,
        },
        statRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
        adherenceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 12 },
        adherenceLabel: { fontSize: 14 },
        adherenceValue: { fontSize: 24, fontWeight: '700' },
        summaryType: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
        emptyText: { fontSize: 18, fontWeight: '600', marginTop: 12 },
        emptySubtext: { fontSize: 14, marginTop: 4 },
        emptyCardText: { fontSize: 14, textAlign: 'center' },
        errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
        errorText: { fontSize: 14 },
        retryLink: { fontSize: 14, fontWeight: '600' },

        // ─── PDF Download ───
        pdfButton: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            borderRadius: 12, paddingVertical: 16, marginTop: 4,
        },
        pdfButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

        // ─── Disease-wise ───
        diseaseSection: { marginTop: 16 },
        diseaseLabel: { fontSize: 13, marginBottom: 8 },
        diseaseButton: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16,
            marginBottom: 8, borderWidth: 1,
        },
        diseaseButtonDisabled: { opacity: 0.6 },
        diseaseInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
        diseaseName: { fontSize: 15, fontWeight: '600' },
        statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
        statusText: { fontSize: 11, fontWeight: '600' },
    });
}
