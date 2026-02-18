import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useCreateMedicine } from '../../src/hooks/useMedicines';
import { usePatientContext } from '../../src/context/PatientContext';

const FREQUENCIES = ['daily', 'twice_daily', 'weekly', 'as_needed'] as const;
const TYPES = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops', 'Inhaler', 'Other'] as const;
const SLOTS = [
    { id: 'morning', label: 'Morning', meal: 'Breakfast' },
    { id: 'afternoon', label: 'Afternoon', meal: 'Lunch' },
    { id: 'evening', label: 'Evening', meal: 'Dinner' },
] as const;

export default function AddMedicineScreen() {
    const router = useRouter();
    const { activePatientId } = usePatientContext();
    const createMedicine = useCreateMedicine();

    const [name, setName] = useState('');
    const [type, setType] = useState('Tablet');
    const [dose, setDose] = useState('');
    const [unit, setUnit] = useState('tablet');
    const [frequency, setFrequency] = useState<string>('daily');
    const [stock, setStock] = useState('');
    const [intakeSlots, setIntakeSlots] = useState<{ slot: 'morning' | 'afternoon' | 'evening', relation: 'before' | 'after' | 'with' | 'none' }[]>([]);
    const [instructions, setInstructions] = useState('');

    const toggleSlot = (slotId: 'morning' | 'afternoon' | 'evening') => {
        const index = intakeSlots.findIndex(s => s.slot === slotId);
        if (index > -1) {
            setIntakeSlots(intakeSlots.filter(s => s.slot !== slotId));
        } else {
            setIntakeSlots([...intakeSlots, { slot: slotId, relation: 'after' }]);
        }
    };

    const updateRelation = (slotId: string, relation: 'before' | 'after' | 'with' | 'none') => {
        setIntakeSlots(intakeSlots.map(s => s.slot === slotId ? { ...s, relation } : s));
    };

    const handleSubmit = () => {
        if (!activePatientId) {
            Alert.alert('Error', 'No patient selected');
            return;
        }
        if (!name.trim() || !stock.trim()) {
            Alert.alert('Error', 'Please fill in name and stock');
            return;
        }
        if (intakeSlots.length === 0) {
            Alert.alert('Error', 'Please select at least one intake time (Morning, Afternoon, or Evening)');
            return;
        }

        const stockNum = parseInt(stock, 10);
        if (isNaN(stockNum) || stockNum < 0) {
            Alert.alert('Error', 'Invalid stock number');
            return;
        }

        // Map slots to reminder times (simple default mapping)
        const slotTimes: Record<string, string> = { morning: '08:00', afternoon: '13:00', evening: '20:00' };
        const times = intakeSlots.map(s => slotTimes[s.slot]);

        createMedicine.mutate(
            {
                patientId: activePatientId,
                name: name.trim(),
                type,
                dose: dose.trim() || '1',
                unit: unit.trim(),
                frequency,
                intakeSlots,
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
            <View style={styles.chipRow}>
                {TYPES.map((t) => (
                    <TouchableOpacity key={t} style={[styles.chip, type === t && styles.activeChip]} onPress={() => setType(t)}>
                        <Text style={[styles.chipText, type === t && styles.activeChipText]}>{t}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.label}>Dosage Qty *</Text>
                    <TextInput style={styles.input} value={dose} onChangeText={setDose} placeholder="e.g. 1" keyboardType="numeric" placeholderTextColor="#9CA3AF" />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.label}>Unit (e.g. Tablet)</Text>
                    <TextInput style={styles.input} value={unit} onChangeText={setUnit} placeholder="tablet/ml" placeholderTextColor="#9CA3AF" />
                </View>
            </View>

            <Text style={styles.label}>Frequency</Text>
            <View style={styles.chipRow}>
                {FREQUENCIES.map((f) => (
                    <TouchableOpacity key={f} style={[styles.chip, frequency === f && styles.activeChip]} onPress={() => setFrequency(f)}>
                        <Text style={[styles.chipText, frequency === f && styles.activeChipText]}>{f.replace('_', ' ')}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.label}>Intake Schedule *</Text>
            <Text style={styles.subLabel}>Tap to select when to take the medicine</Text>
            {SLOTS.map((slot) => {
                const isSelected = intakeSlots.some(s => s.slot === slot.id);
                const currentSlot = intakeSlots.find(s => s.slot === slot.id);
                return (
                    <View key={slot.id} style={styles.slotEntry}>
                        <TouchableOpacity
                            style={[styles.slotHeader, isSelected && styles.activeSlotHeader]}
                            onPress={() => toggleSlot(slot.id as any)}
                        >
                            <Text style={[styles.slotTabText, isSelected && styles.activeSlotTabText]}>{slot.label}</Text>
                            {isSelected && <Text style={styles.selectedTick}>✓</Text>}
                        </TouchableOpacity>

                        {isSelected && (
                            <View style={styles.relationRow}>
                                {(['before', 'after', 'with'] as const).map((rel) => (
                                    <TouchableOpacity
                                        key={rel}
                                        style={[styles.relChip, currentSlot?.relation === rel && styles.activeRelChip]}
                                        onPress={() => updateRelation(slot.id, rel)}
                                    >
                                        <Text style={[styles.relText, currentSlot?.relation === rel && styles.activeRelText]}>
                                            {rel.charAt(0).toUpperCase() + rel.slice(1)} {slot.meal}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                );
            })}

            <Text style={styles.label}>Current Stock *</Text>
            <TextInput style={styles.input} value={stock} onChangeText={setStock} placeholder="Number of units" keyboardType="numeric" placeholderTextColor="#9CA3AF" />

            <Text style={styles.label}>Instructions</Text>
            <TextInput style={[styles.input, { height: 80 }]} value={instructions} onChangeText={setInstructions} placeholder="e.g. Drink plenty of water" multiline placeholderTextColor="#9CA3AF" />

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={createMedicine.isPending}>
                {createMedicine.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Add Medicine</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 16 },
    subLabel: { fontSize: 12, color: '#6B7280', marginBottom: 12 },
    input: {
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#111827',
    },
    row: { flexDirection: 'row', alignItems: 'center' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
        backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
    },
    activeChip: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
    chipText: { fontSize: 13, color: '#6B7280', textTransform: 'capitalize' },
    activeChipText: { color: '#fff' },

    slotEntry: { marginBottom: 8, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
    slotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#fff' },
    activeSlotHeader: { backgroundColor: '#F5F3FF' },
    slotTabText: { fontSize: 16, fontWeight: '600', color: '#374151' },
    activeSlotTabText: { color: '#4F46E5' },
    selectedTick: { color: '#4F46E5', fontWeight: '700', fontSize: 18 },

    relationRow: { flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', flexWrap: 'wrap' },
    relChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
    activeRelChip: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
    relText: { fontSize: 12, color: '#6B7280' },
    activeRelText: { color: '#fff' },

    submitBtn: { backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24, marginBottom: 32 },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
