import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useLogHealth } from '../../src/hooks/useHealthLogs';
import { usePatientContext } from '../../src/context/PatientContext';
import { Colors } from '../../src/constants/Colors';
import { useTheme } from '../../src/context/ThemeContext';

const HEALTH_TYPES = [
    { label: 'Blood Sugar', key: 'blood_sugar', unit: 'mg/dL', icon: 'water' },
    { label: 'Blood Pressure', key: 'blood_pressure', unit: 'mmHg', icon: 'pulse' },
    { label: 'Weight', key: 'weight', unit: 'kg', icon: 'barbell' },
    { label: 'Heart Rate', key: 'heart_rate', unit: 'bpm', icon: 'heart' },
    { label: 'Oxygen', key: 'spo2', unit: '%', icon: 'thermometer' },
] as const;

export default function AddHealthLogScreen() {
    const router = useRouter();
    const { theme: activeTheme } = useTheme();
    const theme = Colors[activeTheme];
    const styles = getStyles(theme);

    const { activePatientId } = usePatientContext();
    const logHealth = useLogHealth();

    const [selectedType, setSelectedType] = useState<typeof HEALTH_TYPES[number]>(HEALTH_TYPES[0]);
    const [value, setValue] = useState('');
    const [notes, setNotes] = useState('');

    const handleSubmit = () => {
        if (!activePatientId) {
            Alert.alert('Error', 'No patient selected');
            return;
        }
        const numVal = parseFloat(value);
        if (isNaN(numVal) || numVal <= 0) {
            Alert.alert('Error', 'Please enter a valid value');
            return;
        }

        logHealth.mutate(
            {
                patientId: activePatientId,
                type: selectedType.key,
                value: numVal,
                unit: selectedType.unit,
                notes: notes.trim() || undefined,
                recordedAt: new Date().toISOString(),
            },
            {
                onSuccess: () => router.back(),
                onError: (error: any) => Alert.alert('Error', error.response?.data?.error?.message || 'Failed to log health metric'),
            }
        );
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={{ padding: 20 }}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Metric Type</Text>
            <View style={styles.chipRow}>
                {HEALTH_TYPES.map((t) => (
                    <TouchableOpacity
                        key={t.key}
                        style={[styles.chip, selectedType.key === t.key && styles.activeChip, { backgroundColor: theme.card, borderColor: theme.border }]}
                        onPress={() => setSelectedType(t)}
                    >
                        <Text style={[styles.chipText, selectedType.key === t.key && styles.activeChipText, { color: selectedType.key === t.key ? '#fff' : theme.textSecondary }]}>{t.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={[styles.label, { color: theme.textSecondary }]}>Value ({selectedType.unit}) *</Text>
            <TextInput
                style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                value={value}
                onChangeText={setValue}
                placeholder={`Enter ${selectedType.label.toLowerCase()} `}
                keyboardType="decimal-pad"
                placeholderTextColor={theme.inactive}
            />

            <Text style={[styles.label, { color: theme.textSecondary }]}>Notes (optional)</Text>
            <TextInput
                style={[styles.input, { height: 80, backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. fasting, after meal"
                multiline
                placeholderTextColor={theme.inactive}
            />

            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: theme.primary }]} onPress={handleSubmit} disabled={logHealth.isPending}>
                {logHealth.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Log Metric</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
}

function getStyles(theme: any) {
    return StyleSheet.create({
        container: { flex: 1 },
        label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 16 },
        input: {
            borderWidth: 1, borderRadius: 10,
            paddingHorizontal: 14, paddingVertical: 12, fontSize: 16,
        },
        chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
        chip: {
            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
            borderWidth: 1,
        },
        activeChip: { backgroundColor: theme.primary, borderColor: theme.primary },
        chipText: { fontSize: 13 },
        activeChipText: { fontWeight: '600' },
        submitBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
        submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    });
}
