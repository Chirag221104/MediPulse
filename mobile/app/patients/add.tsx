import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCreatePatient } from '../../src/hooks/usePatients';
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/constants/Colors';
import { useTheme } from '../../src/context/ThemeContext';

const GENDERS = ['Male', 'Female', 'Other'] as const;

export default function AddPatientScreen() {
    const router = useRouter();
    const { theme: activeTheme } = useTheme();
    const theme = Colors[activeTheme];
    const styles = getStyles(theme);

    const createMutation = useCreatePatient();

    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState<typeof GENDERS[number]>('Male');
    const [relation, setRelation] = useState('');

    const handleSubmit = () => {
        if (!name.trim() || !age.trim() || !relation.trim()) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        createMutation.mutate(
            {
                name: name.trim(),
                age: parseInt(age),
                gender,
                relation: relation.trim(),
            },
            {
                onSuccess: () => router.back(),
                onError: (error: any) => Alert.alert('Error', error.response?.data?.message || 'Failed to add patient'),
            }
        );
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={{ padding: 24 }}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Full Name *</Text>
            <TextInput
                style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                value={name}
                onChangeText={setName}
                placeholder="e.g. John Doe"
                placeholderTextColor={theme.inactive}
            />

            <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Age *</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                        value={age}
                        onChangeText={setAge}
                        placeholder="e.g. 45"
                        keyboardType="numeric"
                        placeholderTextColor={theme.inactive}
                    />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Relation *</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                        value={relation}
                        onChangeText={setRelation}
                        placeholder="e.g. Father"
                        placeholderTextColor={theme.inactive}
                    />
                </View>
            </View>

            <Text style={[styles.label, { color: theme.textSecondary }]}>Gender</Text>
            <View style={styles.tabContainer}>
                {GENDERS.map((g) => (
                    <TouchableOpacity
                        key={g}
                        style={[
                            styles.tab,
                            gender === g && styles.activeTab,
                            { backgroundColor: gender === g ? theme.primary : theme.card, borderColor: theme.border }
                        ]}
                        onPress={() => setGender(g)}
                    >
                        <Text style={[styles.tabText, gender === g && styles.activeTabText, { color: gender === g ? '#fff' : theme.textSecondary }]}>
                            {g}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: theme.primary }]}
                onPress={handleSubmit}
                disabled={createMutation.isPending}
            >
                {createMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.submitText}>Add Patient Profile</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

function getStyles(theme: any) {
    return StyleSheet.create({
        container: { flex: 1 },
        label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 16 },
        input: {
            borderWidth: 1, borderRadius: 12,
            paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
        },
        row: { flexDirection: 'row' },
        tabContainer: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, overflow: 'hidden', marginTop: 8 },
        tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRightWidth: 1 },
        activeTab: {},
        tabText: { fontSize: 14, fontWeight: '500' },
        activeTabText: { fontWeight: '700' },
        submitButton: {
            borderRadius: 12, paddingVertical: 16,
            alignItems: 'center', marginTop: 32,
            shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5
        },
        submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    });
}
