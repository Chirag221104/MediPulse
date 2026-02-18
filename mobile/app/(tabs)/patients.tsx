import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePatients, useDeletePatient } from '../../src/hooks/usePatients';
import { usePatientContext } from '../../src/context/PatientContext';
import { useAuth } from '../../src/context/AuthContext';

export default function PatientsScreen() {
    const router = useRouter();
    const { logout, user } = useAuth();
    const { data: patients, isLoading, isError, refetch } = usePatients();
    const { activePatientId, setActivePatientId } = usePatientContext();
    const deleteMutation = useDeletePatient();

    const handleDelete = (id: string, name: string) => {
        Alert.alert('Delete Patient', `Are you sure you want to remove ${name}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: () => {
                    deleteMutation.mutate(id);
                    if (activePatientId === id) setActivePatientId(null);
                },
            },
        ]);
    };

    if (isLoading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#4F46E5" /></View>;
    }

    if (isError) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>Failed to load patients</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.greeting}>Hi, {user?.name ?? 'User'}</Text>
                <TouchableOpacity onPress={logout}>
                    <Ionicons name="log-out-outline" size={24} color="#EF4444" />
                </TouchableOpacity>
            </View>

            {(!patients || patients.length === 0) ? (
                <View style={styles.center}>
                    <Ionicons name="people-outline" size={64} color="#D1D5DB" />
                    <Text style={styles.emptyText}>No patients yet</Text>
                    <Text style={styles.emptySubtext}>Add your first patient profile</Text>
                </View>
            ) : (
                <FlatList
                    data={patients}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={{ padding: 16 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.card, activePatientId === item._id && styles.activeCard]}
                            onPress={() => setActivePatientId(item._id)}
                            onLongPress={() => handleDelete(item._id, item.name)}
                        >
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.name}>{item.name}</Text>
                                <Text style={styles.detail}>{item.relation} • {item.age}y • {item.gender}</Text>
                            </View>
                            {activePatientId === item._id && (
                                <Ionicons name="checkmark-circle" size={24} color="#4F46E5" />
                            )}
                        </TouchableOpacity>
                    )}
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={() => router.push('/patients/add')}>
                <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    greeting: { fontSize: 20, fontWeight: '600', color: '#111827' },
    card: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12,
        padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB',
    },
    activeCard: { borderColor: '#4F46E5', borderWidth: 2, backgroundColor: '#EEF2FF' },
    avatar: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: '#4F46E5',
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
    name: { fontSize: 16, fontWeight: '600', color: '#111827' },
    detail: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    emptyText: { fontSize: 18, fontWeight: '600', color: '#6B7280', marginTop: 12 },
    emptySubtext: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
    errorText: { fontSize: 16, color: '#EF4444', marginBottom: 12 },
    retryButton: { backgroundColor: '#4F46E5', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
    retryText: { color: '#fff', fontWeight: '600' },
    fab: {
        position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28,
        backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', elevation: 4,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
    },
});
