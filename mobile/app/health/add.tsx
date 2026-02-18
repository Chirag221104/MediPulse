import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useLogHealth } from '../../src/hooks/useHealthLogs';
import { usePatientContext } from '../../src/context/PatientContext';

const HEALTH_TYPES = [
    { key: 'blood_sugar', label: 'Blood Sugar', unit: 'mg/dL' },
    { key: 'blood_pressure', label: 'Blood Pressure', unit: 'mmHg' },
    { key: 'weight', label: 'Weight', unit: 'kg' },
    { key: 'heart_rate', label: 'Heart Rate', unit: 'bpm' },
    { key: 'spo2', label: 'SpO2', unit: '%' },
];

export default function AddHealthLogScreen() {
    const router = useRouter();
    const { activePatientId } = usePatientContext();
    const logHealth = useLogHealth();

    const [selectedType, setSelectedType] = useState(HEALTH_TYPES[0]);
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
        <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.label}>Metric Type</Text>
            <View style={styles.chipRow}>
                {HEALTH_TYPES.map((t) => (
                    <TouchableOpacity
                        key={t.key}
                        style={[styles.chip, selectedType.key === t.key && styles.activeChip]}
                        onPress={() => setSelectedType(t)}
                    >
                        <Text style={[styles.chipText, selectedType.key === t.key && styles.activeChipText]}>{t.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.label}>Value ({selectedType.unit}) *</Text>
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={setValue}
                placeholder={`Enter ${selectedType.label.toLowerCase()}`}
                keyboardType="decimal-pad"
                placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
                style={[styles.input, { height: 80 }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. fasting, after meal"
                multiline
                placeholderTextColor="#9CA3AF"
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={logHealth.isPending}>
                {logHealth.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Log Metric</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 16 },
    input: {
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#111827',
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
        backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
    },
    activeChip: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
    chipText: { fontSize: 13, color: '#6B7280' },
    activeChipText: { color: '#fff' },
    submitBtn: { backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
