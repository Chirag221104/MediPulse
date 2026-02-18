import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCreateMedicine } from '../../src/hooks/useMedicines';
import { usePatientContext } from '../../src/context/PatientContext';

const TYPES = ['Tablet', 'Syrup', 'Injection', 'Drops', 'Cream', 'Inhaler'] as const;
const SLOTS = [
    { id: 'morning', label: 'Morning', mealKey: 'breakfast' },
    { id: 'afternoon', label: 'Afternoon', mealKey: 'lunch' },
    { id: 'evening', label: 'Evening', mealKey: 'dinner' },
] as const;

type SlotId = 'morning' | 'afternoon' | 'evening';
type MealRelation = 'before_breakfast' | 'after_breakfast' | 'before_lunch' | 'after_lunch' | 'before_dinner' | 'after_dinner';

interface FormSlot {
    timeOfDay: SlotId;
    mealRelation?: MealRelation;
    quantity?: string; // String for input, convert to number on submit
}

export default function AddMedicineScreen() {
    const router = useRouter();
    const { activePatientId } = usePatientContext();
    const createMedicine = useCreateMedicine();

    // Medicine Info
    const [name, setName] = useState('');
    const [type, setType] = useState<typeof TYPES[number]>('Tablet');

    // Dose Structure
    const [strength, setStrength] = useState('');
    const [quantityPerDose, setQuantityPerDose] = useState('1');
    const [unit, setUnit] = useState('tablet');

    // Schedule Structure
    const [slots, setSlots] = useState<FormSlot[]>([]);

    // Stock & Metadata
    const [stock, setStock] = useState('');
    const [lowStockThreshold, setLowStockThreshold] = useState('5');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

    const toggleSlot = (slotId: SlotId) => {
        const exists = slots.some(s => s.timeOfDay === slotId);
        if (exists) {
            setSlots(slots.filter(s => s.timeOfDay !== slotId));
        } else {
            setSlots([...slots, { timeOfDay: slotId }]);
        }
    };

    const updateSlotRelation = (slotId: SlotId, mealKey: string, rel: 'before' | 'after') => {
        const relation = `${rel}_${mealKey}` as MealRelation;
        setSlots(slots.map(s => s.timeOfDay === slotId ? { ...s, mealRelation: relation } : s));
    };

    const updateSlotQuantity = (slotId: SlotId, qty: string) => {
        setSlots(slots.map(s => s.timeOfDay === slotId ? { ...s, quantity: qty } : s));
    };

    const handleSubmit = () => {
        if (!activePatientId) {
            Alert.alert('Error', 'No patient selected');
            return;
        }
        if (!name.trim() || !quantityPerDose.trim() || !unit.trim() || !stock.trim()) {
            Alert.alert('Error', 'Please fill in all required fields (*)');
            return;
        }
        if (slots.length === 0) {
            Alert.alert('Error', 'Please select at least one intake time');
            return;
        }

        const qtyNum = parseFloat(quantityPerDose);
        const stockNum = parseFloat(stock);
        const thresholdNum = parseInt(lowStockThreshold, 10);

        if (isNaN(qtyNum) || qtyNum <= 0) return Alert.alert('Error', 'Invalid dose quantity');
        if (isNaN(stockNum) || stockNum < 0) return Alert.alert('Error', 'Invalid stock amount');

        const payload = {
            patientId: activePatientId,
            name: name.trim(),
            type,
            dose: {
                strength: strength.trim() || undefined,
                quantityPerDose: qtyNum,
                unit: unit.trim().toLowerCase(),
            },
            schedule: {
                slots: slots.map(s => ({
                    timeOfDay: s.timeOfDay,
                    mealRelation: s.mealRelation,
                    quantity: s.quantity ? parseFloat(s.quantity) : undefined,
                    reminderTime: s.timeOfDay === 'morning' ? '08:00' : s.timeOfDay === 'afternoon' ? '13:00' : '20:00',
                })),
            },
            stock: stockNum,
            lowStockThreshold: thresholdNum,
            startDate,
        };

        createMedicine.mutate(payload, {
            onSuccess: () => router.back(),
            onError: (error: any) => Alert.alert('Error', error.response?.data?.message || 'Failed to add medicine'),
        });
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <Text style={styles.label}>Medicine Name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Paracetamol" placeholderTextColor="#9CA3AF" />

            <Text style={styles.label}>Medicine Type</Text>
            <View style={styles.chipRow}>
                {TYPES.map((t) => (
                    <TouchableOpacity key={t} style={[styles.chip, type === t && styles.activeChip]} onPress={() => {
                        setType(t);
                        if (t === 'Tablet') setUnit('tablet');
                        else if (t === 'Syrup') setUnit('ml');
                        else if (t === 'Drops') setUnit('drops');
                    }}>
                        <Text style={[styles.chipText, type === t && styles.activeChipText]}>{t}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.sectionTitle}>Dosage Details</Text>

            <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.label}>Strength (Optional)</Text>
                    <TextInput style={styles.input} value={strength} onChangeText={setStrength} placeholder="e.g. 500mg" placeholderTextColor="#9CA3AF" />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.label}>Default Qty *</Text>
                    <TextInput style={styles.input} value={quantityPerDose} onChangeText={setQuantityPerDose} placeholder="1" keyboardType="numeric" />
                </View>
            </View>

            <Text style={styles.label}>Unit *</Text>
            <TextInput style={styles.input} value={unit} onChangeText={setUnit} placeholder="tablet, ml, drops..." placeholderTextColor="#9CA3AF" />

            <Text style={styles.sectionTitle}>Intake Schedule</Text>
            <Text style={styles.subLabel}>When should this be taken?</Text>

            {SLOTS.map((slot) => {
                const isSelected = slots.some(s => s.timeOfDay === slot.id);
                const currentFormSlot = slots.find(s => s.timeOfDay === slot.id);

                return (
                    <View key={slot.id} style={[styles.slotCard, isSelected && styles.activeSlotCard]}>
                        <TouchableOpacity style={styles.slotHeader} onPress={() => toggleSlot(slot.id)}>
                            <View style={styles.slotHeaderLeft}>
                                <View style={[styles.checkbox, isSelected && styles.checkedBox]}>
                                    {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                                </View>
                                <Text style={[styles.slotLabel, isSelected && styles.activeSlotLabel]}>{slot.label}</Text>
                            </View>
                        </TouchableOpacity>

                        {isSelected && (
                            <View style={styles.slotDetails}>
                                <Text style={styles.innerLabel}>Relation to {slot.mealKey}</Text>
                                <View style={styles.relRow}>
                                    {['before', 'after'].map((rel) => {
                                        const relValue = `${rel}_${slot.mealKey}`;
                                        const isActive = currentFormSlot?.mealRelation === relValue;
                                        return (
                                            <TouchableOpacity
                                                key={rel}
                                                style={[styles.relChip, isActive && styles.activeRelChip]}
                                                onPress={() => updateSlotRelation(slot.id, slot.mealKey, rel as any)}
                                            >
                                                <Text style={[styles.relText, isActive && styles.activeRelText]}>
                                                    {rel.charAt(0).toUpperCase() + rel.slice(1)} {slot.mealKey}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                <Text style={styles.innerLabel}>Qty Override (Optional)</Text>
                                <TextInput
                                    style={styles.miniInput}
                                    value={currentFormSlot?.quantity || ''}
                                    onChangeText={(text) => updateSlotQuantity(slot.id, text)}
                                    placeholder="Leave empty for default"
                                    keyboardType="numeric"
                                />
                            </View>
                        )}
                    </View>
                );
            })}

            <Text style={styles.sectionTitle}>Inventory</Text>

            <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.label}>Current Stock *</Text>
                    <TextInput style={styles.input} value={stock} onChangeText={setStock} placeholder="Total units" keyboardType="numeric" />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.label}>Low Alert At</Text>
                    <TextInput style={styles.input} value={lowStockThreshold} onChangeText={setLowStockThreshold} placeholder="5" keyboardType="numeric" />
                </View>
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={createMedicine.isPending}>
                {createMedicine.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save Medicine</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 24, marginBottom: 8 },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
    subLabel: { fontSize: 12, color: '#6B7280', marginBottom: 16 },
    innerLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 8, marginTop: 8 },
    input: {
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1F2937',
    },
    miniInput: {
        backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8,
        paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#1F2937',
    },
    row: { flexDirection: 'row' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    chip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
    },
    activeChip: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
    chipText: { fontSize: 13, color: '#4B5563' },
    activeChipText: { color: '#fff', fontWeight: '600' },

    slotCard: {
        backgroundColor: '#fff', borderRadius: 16, marginBottom: 10,
        borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden'
    },
    activeSlotCard: { borderColor: '#C7D2FE', backgroundColor: '#F5F3FF' },
    slotHeader: { padding: 16 },
    slotHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
    checkedBox: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
    slotLabel: { fontSize: 16, fontWeight: '600', color: '#374151' },
    activeSlotLabel: { color: '#4F46E5' },

    slotDetails: { padding: 16, paddingTop: 0, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    relRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    relChip: {
        flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8,
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB'
    },
    activeRelChip: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
    relText: { fontSize: 12, color: '#6B7280' },
    activeRelText: { color: '#4F46E5', fontWeight: '600' },

    submitBtn: {
        backgroundColor: '#4F46E5', borderRadius: 16, paddingVertical: 18,
        alignItems: 'center', marginTop: 32, marginBottom: 40,
        shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
    },
    submitText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    emptyText: { fontSize: 18, fontWeight: '600', color: '#6B7280', marginTop: 12 },
    emptySubtext: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
    errorText: { fontSize: 16, color: '#EF4444', marginBottom: 12 },
    retryButton: { backgroundColor: '#4F46E5', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
    retryText: { color: '#fff', fontWeight: '600' },
});
