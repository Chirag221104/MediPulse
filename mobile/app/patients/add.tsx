import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useCreatePatient } from '../../src/hooks/usePatients';

export default function AddPatientScreen() {
    const router = useRouter();
    const createPatient = useCreatePatient();
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState<string>('male');
    const [relation, setRelation] = useState('');

    const handleSubmit = () => {
        if (!name.trim() || !age.trim() || !relation.trim()) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }
        const ageNum = parseInt(age, 10);
        if (isNaN(ageNum) || ageNum <= 0) {
            Alert.alert('Error', 'Please enter a valid age');
            return;
        }

        createPatient.mutate(
            { name: name.trim(), age: ageNum, gender, relation: relation.trim() },
            {
                onSuccess: () => router.back(),
                onError: (error: any) => Alert.alert('Error', error.response?.data?.error?.message || 'Failed to create patient'),
            }
        );
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.label}>Name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Patient name" placeholderTextColor="#9CA3AF" />

            <Text style={styles.label}>Age *</Text>
            <TextInput style={styles.input} value={age} onChangeText={setAge} placeholder="Age" keyboardType="numeric" placeholderTextColor="#9CA3AF" />

            <Text style={styles.label}>Gender *</Text>
            <View style={styles.genderRow}>
                {['male', 'female', 'other'].map((g) => (
                    <TouchableOpacity key={g} style={[styles.genderChip, gender === g && styles.activeGender]} onPress={() => setGender(g)}>
                        <Text style={[styles.genderText, gender === g && styles.activeGenderText]}>{g}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.label}>Relation *</Text>
            <TextInput style={styles.input} value={relation} onChangeText={setRelation} placeholder="e.g. Father, Self, Mother" placeholderTextColor="#9CA3AF" />

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={createPatient.isPending}>
                {createPatient.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Add Patient</Text>}
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
    genderRow: { flexDirection: 'row', gap: 8 },
    genderChip: {
        paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8,
        backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
    },
    activeGender: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
    genderText: { fontSize: 14, color: '#6B7280', textTransform: 'capitalize' },
    activeGenderText: { color: '#fff' },
    submitBtn: { backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
