import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useCreateMedicine } from '../../src/hooks/useMedicines';
import { usePatientContext } from '../../src/context/PatientContext';

const FREQUENCIES = ['daily', 'twice_daily', 'weekly', 'as_needed'] as const;

export default function AddMedicineScreen() {
    const router = useRouter();
    const { activePatientId } = usePatientContext();
    const createMedicine = useCreateMedicine();

    const [name, setName] = useState('');
    const [type, setType] = useState('Tablet');
    const [dose, setDose] = useState('');
    const [frequency, setFrequency] = useState<string>('daily');
    const [stock, setStock] = useState('');
    const [reminderTimes, setReminderTimes] = useState('08:00');
    const [instructions, setInstructions] = useState('');

    const handleSubmit = () => {
        if (!activePatientId) {
            Alert.alert('Error', 'No patient selected');
            return;
        }
        if (!name.trim() || !dose.trim() || !stock.trim()) {
            Alert.alert('Error', 'Please fill in name, dose, and stock');
            return;
        }

        const stockNum = parseInt(stock, 10);
        if (isNaN(stockNum) || stockNum < 0) {
            Alert.alert('Error', 'Invalid stock number');
            return;
        }

        const times = reminderTimes.split(',').map((t) => t.trim()).filter(Boolean);

        createMedicine.mutate(
            {
                patientId: activePatientId,
                name: name.trim(),
                type: type.trim(),
                dose: dose.trim(),
                frequency,
                stock: stockNum,
                startDate: new Date().toISOString(),
                reminderTimes: times,
                instructions: instructions.trim() || undefined,
            },
            {
                onSuccess: () => router.back(),
                onError: (error: any) => Alert.alert('Error', error.response?.data?.error?.message || 'Failed to add medicine'),
            }
        );
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.label}>Medicine Name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Metformin" placeholderTextColor="#9CA3AF" />

            <Text style={styles.label}>Type</Text>
            <TextInput style={styles.input} value={type} onChangeText={setType} placeholder="e.g. Tablet, Syrup" placeholderTextColor="#9CA3AF" />

            <Text style={styles.label}>Dose *</Text>
            <TextInput style={styles.input} value={dose} onChangeText={setDose} placeholder="e.g. 500mg" placeholderTextColor="#9CA3AF" />

            <Text style={styles.label}>Frequency</Text>
            <View style={styles.chipRow}>
                {FREQUENCIES.map((f) => (
                    <TouchableOpacity key={f} style={[styles.chip, frequency === f && styles.activeChip]} onPress={() => setFrequency(f)}>
                        <Text style={[styles.chipText, frequency === f && styles.activeChipText]}>{f.replace('_', ' ')}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.label}>Stock *</Text>
            <TextInput style={styles.input} value={stock} onChangeText={setStock} placeholder="Number of units" keyboardType="numeric" placeholderTextColor="#9CA3AF" />

            <Text style={styles.label}>Reminder Times (comma-separated)</Text>
            <TextInput style={styles.input} value={reminderTimes} onChangeText={setReminderTimes} placeholder="08:00, 20:00" placeholderTextColor="#9CA3AF" />

            <Text style={styles.label}>Instructions</Text>
            <TextInput style={[styles.input, { height: 80 }]} value={instructions} onChangeText={setInstructions} placeholder="e.g. Take with food" multiline placeholderTextColor="#9CA3AF" />

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={createMedicine.isPending}>
                {createMedicine.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Add Medicine</Text>}
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
    chipText: { fontSize: 13, color: '#6B7280', textTransform: 'capitalize' },
    activeChipText: { color: '#fff' },
    submitBtn: { backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24, marginBottom: 32 },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
