import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, TextInput, ActivityIndicator, Alert, Platform, Linking } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/context/ThemeContext';
import { Colors } from '../src/constants/Colors';
import { usePatientContext } from '../src/context/PatientContext';
import { useQuery } from '@tanstack/react-query';
import { patientService, Patient } from '../src/services/patient.service';
import { useUpdatePatient } from '../src/hooks/usePatients';
import { useMedicines } from '../src/hooks/useMedicines';
import { rescheduleAllAlarms } from '../src/utils/notifications';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

const REPEAT_MODES = [
    { label: 'Daily', value: 'daily' },
    { label: 'Specific Days', value: 'specific_days' },
    { label: 'Interval', value: 'interval' },
    { label: 'One-time', value: 'one_time' }
];

export default function SettingsScreen() {
    const router = useRouter();
    const { theme: activeTheme } = useTheme();
    const theme = Colors[activeTheme];
    const styles = getStyles(theme);

    const { activePatientId } = usePatientContext();
    const { data: patients, isLoading: isLoadingPatients, isError: isErrorPatients } = useQuery({
        queryKey: ['patients'],
        queryFn: patientService.getAll
    });

    const activePatient = patients?.find(p => p._id === activePatientId);
    const updatePatient = useUpdatePatient();
    const { data: medicines } = useMedicines(activePatientId);

    const [settings, setSettings] = useState<any>(null);
    const [permissions, setPermissions] = useState({
        notifications: 'undetermined',
        exactAlarm: false,
    });

    // Initialize settings from activePatient
    useEffect(() => {
        if (activePatient) {
            setSettings({
                mealTimings: activePatient.mealTimings || { breakfast: '08:00', lunch: '13:00', dinner: '20:00' },
                leadTime: activePatient.alarmSettings?.leadTime ?? 0,
                defaultBeforeOffset: activePatient.alarmSettings?.defaultBeforeOffset ?? 15,
                defaultAfterOffset: activePatient.alarmSettings?.defaultAfterOffset ?? 15,
                snoozeMinutes: activePatient.alarmSettings?.snoozeMinutes ?? 10,
                maxSnoozeCount: activePatient.alarmSettings?.maxSnoozeCount ?? 3,
                repeatMode: activePatient.alarmSettings?.repeatMode ?? 'daily',
                fullScreenEnabled: activePatient.alarmSettings?.fullScreenEnabled ?? true,
                escalateIfMissed: activePatient.alarmSettings?.escalateIfMissed ?? true,
                gradualVolume: activePatient.alarmSettings?.gradualVolume ?? true,
                vibrationEnabled: activePatient.alarmSettings?.vibrationEnabled ?? true,
            });
        }
    }, [activePatient]);

    useEffect(() => {
        checkPermissions();
    }, []);

    const checkPermissions = async () => {
        const { status } = await Notifications.getPermissionsAsync();
        let exactGranted = true;

        if (Platform.OS === 'android' && !isExpoGo) {
            try {
                const { AlarmModule } = require('../src/utils/nativeAlarms');
                if (AlarmModule && AlarmModule.checkExactAlarmPermission) {
                    exactGranted = await AlarmModule.checkExactAlarmPermission();
                }
            } catch (e) {
                console.warn('Failed to check exact alarm permission:', e);
            }
        }

        setPermissions({
            notifications: status,
            exactAlarm: exactGranted,
        });
    };

    const handleSave = async () => {
        if (!activePatientId || !settings) return;

        updatePatient.mutate({
            id: activePatientId,
            payload: {
                mealTimings: settings.mealTimings,
                alarmSettings: {
                    leadTime: settings.leadTime,
                    defaultBeforeOffset: settings.defaultBeforeOffset,
                    defaultAfterOffset: settings.defaultAfterOffset,
                    snoozeMinutes: settings.snoozeMinutes,
                    maxSnoozeCount: settings.maxSnoozeCount,
                    repeatMode: settings.repeatMode,
                    fullScreenEnabled: settings.fullScreenEnabled,
                    escalateIfMissed: settings.escalateIfMissed,
                    gradualVolume: settings.gradualVolume,
                    vibrationEnabled: settings.vibrationEnabled,
                }
            }
        }, {
            onSuccess: async () => {
                if (medicines) {
                    await rescheduleAllAlarms(medicines, settings.mealTimings, settings);
                }
                Alert.alert('Success', 'Settings updated and alarms rescheduled! ✅');
            },
            onError: (err: any) => {
                Alert.alert('Error', err.response?.data?.message || 'Failed to save settings');
            }
        });
    };

    if (isLoadingPatients && !settings) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    if (!activePatientId || (!activePatient && !isLoadingPatients)) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <Ionicons name="people-outline" size={64} color={theme.border} />
                <Text style={[styles.noPatientText, { color: theme.text }]}>No Patient Selected</Text>
                <Text style={[styles.noPatientSub, { color: theme.textSecondary }]}>Select a patient from the Patients tab to configure their alarms.</Text>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: theme.primary, marginTop: 24 }]}
                    onPress={() => router.push('/(tabs)/patients')}
                >
                    <Text style={styles.buttonText}>Go to Patients</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!settings) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    const Section = ({ title, children, icon }: { title: string, children: React.ReactNode, icon: string }) => (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Ionicons name={icon as any} size={20} color={theme.primary} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
            </View>
            <View style={[styles.sectionContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {children}
            </View>
        </View>
    );

    const SettingRow = ({ label, value, onValueChange, type = 'switch', placeholder = '' }: any) => (
        <View style={[styles.row, { borderBottomColor: theme.border }]}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
            {type === 'switch' ? (
                <Switch
                    value={value}
                    onValueChange={onValueChange}
                    trackColor={{ false: theme.border, true: theme.primary }}
                    thumbColor="#fff"
                />
            ) : (
                <TextInput
                    style={[styles.rowInput, { color: theme.primary }]}
                    value={String(value)}
                    onChangeText={onValueChange}
                    keyboardType="numeric"
                    placeholder={placeholder}
                    placeholderTextColor={theme.inactive}
                />
            )}
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{
                headerShown: true,
                title: 'Alarm Settings',
                headerStyle: { backgroundColor: theme.primary },
                headerTintColor: '#fff',
            }} />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Section title="Meal Timings" icon="restaurant-outline">
                    {(['breakfast', 'lunch', 'dinner'] as const).map(meal => (
                        <View key={meal} style={[styles.row, { borderBottomColor: theme.border }]}>
                            <Text style={[styles.rowLabel, { color: theme.text, textTransform: 'capitalize' }]}>{meal}</Text>
                            <TextInput
                                style={[styles.rowInput, { color: theme.primary }]}
                                value={settings.mealTimings[meal]}
                                onChangeText={(val) => setSettings({ ...settings, mealTimings: { ...settings.mealTimings, [meal]: val } })}
                                placeholder="00:00"
                            />
                        </View>
                    ))}
                </Section>

                <Section title="Alarm Timing Behavior" icon="time-outline">
                    <SettingRow
                        label="Remind Before (min)"
                        type="input"
                        value={settings.defaultBeforeOffset}
                        onValueChange={(val: string) => setSettings({ ...settings, defaultBeforeOffset: parseInt(val) || 0 })}
                    />
                    <SettingRow
                        label="Delay After (min)"
                        type="input"
                        value={settings.defaultAfterOffset}
                        onValueChange={(val: string) => setSettings({ ...settings, defaultAfterOffset: parseInt(val) || 0 })}
                    />
                </Section>

                <Section title="Snooze Settings" icon="notifications-off-outline">
                    <SettingRow
                        label="Snooze Duration (min)"
                        type="input"
                        value={settings.snoozeMinutes}
                        onValueChange={(val: string) => setSettings({ ...settings, snoozeMinutes: parseInt(val) || 0 })}
                    />
                    <SettingRow
                        label="Max Snoozes"
                        type="input"
                        value={settings.maxSnoozeCount}
                        onValueChange={(val: string) => setSettings({ ...settings, maxSnoozeCount: parseInt(val) || 0 })}
                    />
                </Section>

                <Section title="Alarm Behavior" icon="flash-outline">
                    <SettingRow
                        label="Full-Screen Alarm"
                        value={settings.fullScreenEnabled}
                        onValueChange={(val: boolean) => setSettings({ ...settings, fullScreenEnabled: val })}
                    />
                    <SettingRow
                        label="Escalate if Missed"
                        value={settings.escalateIfMissed}
                        onValueChange={(val: boolean) => setSettings({ ...settings, escalateIfMissed: val })}
                    />
                    <SettingRow
                        label="Gradual Volume"
                        value={settings.gradualVolume}
                        onValueChange={(val: boolean) => setSettings({ ...settings, gradualVolume: val })}
                    />
                    <SettingRow
                        label="Vibration"
                        value={settings.vibrationEnabled}
                        onValueChange={(val: boolean) => setSettings({ ...settings, vibrationEnabled: val })}
                    />
                </Section>

                <Section title="Permissions Status" icon="shield-checkmark-outline">
                    <View style={styles.permissionItem}>
                        <View>
                            <Text style={[styles.rowLabel, { color: theme.text }]}>Notifications</Text>
                            <Text style={styles.permissionSub}>{permissions.notifications === 'granted' ? 'Enabled ✅' : 'Disabled ❌'}</Text>
                        </View>
                        {permissions.notifications !== 'granted' && (
                            <TouchableOpacity onPress={() => Linking.openSettings()}>
                                <Text style={{ color: theme.primary, fontWeight: '600' }}>FIX</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <View style={[styles.permissionItem, { borderTopWidth: 1, borderTopColor: theme.border }]}>
                        <View>
                            <Text style={[styles.rowLabel, { color: theme.text }]}>Exact Alarms</Text>
                            <Text style={styles.permissionSub}>{permissions.exactAlarm ? 'Granted ✅' : 'Restricted ❌'}</Text>
                        </View>
                    </View>
                </Section>

                <Section title="Debug & Testing" icon="bug-outline">
                    <View style={styles.permissionItem}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.rowLabel, { color: theme.text }]}>Test Native Alarm</Text>
                            <Text style={styles.permissionSub}>Fires the full-screen alarm activity immediately (5s delay) to verify sound/UI.</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: theme.primarySurface, borderWidth: 1, borderColor: theme.primary }]}
                            onPress={() => {
                                Alert.alert('Test Alarm', 'Native Alarm Activity will fire in 5 seconds. Please lock your screen or go to home screen to test.');
                                const { scheduleTestNotification } = require('../src/utils/notifications');
                                scheduleTestNotification();
                            }}
                        >
                            <Text style={[styles.buttonText, { color: theme.primary }]}>TEST</Text>
                        </TouchableOpacity>
                    </View>
                </Section>

                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: theme.primary }]}
                    onPress={handleSave}
                    disabled={updatePatient.isPending}
                >
                    {updatePatient.isPending ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveButtonText}>Apply Changes</Text>
                    )}
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

function getStyles(theme: any) {
    return StyleSheet.create({
        container: { flex: 1 },
        center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        scrollContent: { padding: 16 },
        section: { marginBottom: 24 },
        sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingLeft: 4 },
        sectionTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
        sectionContent: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
        row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
        rowLabel: { fontSize: 16, fontWeight: '500' },
        rowInput: { fontSize: 16, fontWeight: '600', textAlign: 'right', minWidth: 60, padding: 4 },
        permissionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
        permissionSub: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
        saveButton: { padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 8, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
        saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
        noPatientText: { fontSize: 20, fontWeight: '700', marginTop: 16 },
        noPatientSub: { fontSize: 14, textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
        button: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, elevation: 2 },
        buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    });
}
