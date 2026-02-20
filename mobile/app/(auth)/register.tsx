import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/Colors';
import { useTheme } from '../../src/context/ThemeContext';

export default function RegisterScreen() {
    const { register, isLoading } = useAuth();
    const router = useRouter();
    const { theme: activeTheme } = useTheme();
    const theme = Colors[activeTheme];
    const styles = getStyles(theme);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRegister = async () => {
        setError('');
        if (!name.trim() || !email.trim() || !password.trim()) {
            setError('Please fill in all fields');
            return;
        }
        setLoading(true);
        try {
            await register(name.trim(), email.trim(), password);
            router.replace('/(tabs)/patients');
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Registration failed. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.inner}>
                <Text style={[styles.title, { color: theme.primary }]}>Join MediPulse</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Manage your family's health better</Text>

                {error ? (
                    <View style={[styles.errorBanner, { backgroundColor: theme.error + '10', borderColor: theme.error }]}>
                        <Ionicons name="alert-circle" size={18} color={theme.error} />
                        <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
                    </View>
                ) : null}

                <TextInput
                    style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                    placeholder="Full Name"
                    value={name}
                    onChangeText={(t) => { setName(t); setError(''); }}
                    placeholderTextColor={theme.inactive}
                />

                <TextInput
                    style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                    placeholder="Email"
                    value={email}
                    onChangeText={(t) => { setEmail(t); setError(''); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor={theme.inactive}
                />

                <View style={[styles.passwordContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <TextInput
                        style={[styles.passwordInput, { color: theme.text }]}
                        placeholder="Password"
                        value={password}
                        onChangeText={(t) => { setPassword(t); setError(''); }}
                        secureTextEntry={!showPassword}
                        placeholderTextColor={theme.inactive}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={24} color={theme.textSecondary} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={[styles.button, { backgroundColor: theme.primary }]} onPress={handleRegister} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign Up</Text>}
                </TouchableOpacity>

                <Link href="/(auth)/login" style={styles.link}>
                    <Text style={[styles.linkText, { color: theme.primary }]}>Already have an account? Login</Text>
                </Link>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function getStyles(theme: any) {
    return StyleSheet.create({
        container: { flex: 1 },
        inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
        title: { fontSize: 32, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
        subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 32 },
        input: {
            borderWidth: 1, borderRadius: 12,
            paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 12,
        },
        passwordContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderRadius: 12,
            marginBottom: 12,
        },
        passwordInput: {
            flex: 1,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 16,
        },
        eyeIcon: {
            paddingHorizontal: 16,
        },
        button: {
            borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8,
        },
        buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
        link: { marginTop: 16, alignSelf: 'center' },
        linkText: { fontSize: 14 },
        errorBanner: {
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            marginBottom: 12,
            gap: 8,
        },
        errorText: { fontSize: 14, flex: 1 },
    });
}
