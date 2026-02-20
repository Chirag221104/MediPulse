import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { NativeAlarm } from './nativeAlarms';
import { Platform, Alert } from 'react-native';
import { Medicine, ScheduleSlot } from '../services/medicine.service';

export interface MealTimings {
    breakfast: string; // "HH:MM"
    lunch: string;
    dinner: string;
}

const DEFAULT_MEAL_TIMINGS: MealTimings = {
    breakfast: '08:00',
    lunch: '13:00',
    dinner: '20:00',
};

/**
 * Compute the correct reminder time for a slot based on its mealRelation.
 * - before_breakfast/lunch/dinner → meal time − 15 min
 * - after_breakfast/lunch/dinner  → meal time + 15 min
 * - no relation → fallback default (08:00 / 13:00 / 20:00)
 */
export const computeReminderTime = (
    slot: Pick<ScheduleSlot, 'timeOfDay' | 'mealRelation'>,
    mealTimings?: MealTimings,
    offsets?: { beforeMinutes?: number, afterMinutes?: number }
): string => {
    const timings = mealTimings ?? DEFAULT_MEAL_TIMINGS;
    const relation = slot.mealRelation;
    const beforeOff = offsets?.beforeMinutes ?? 15;
    const afterOff = offsets?.afterMinutes ?? 15;

    if (!relation) {
        // No meal relation → use slot-based defaults
        return slot.timeOfDay === 'morning' ? timings.breakfast
            : slot.timeOfDay === 'afternoon' ? timings.lunch
                : timings.dinner;
    }

    // Parse which meal and direction
    const isBefore = relation.startsWith('before');
    const mealKey = relation.includes('breakfast') ? 'breakfast'
        : relation.includes('lunch') ? 'lunch'
            : 'dinner';

    const mealTime = timings[mealKey] || DEFAULT_MEAL_TIMINGS[mealKey];
    const [h, m] = mealTime.split(':').map(Number);
    let totalMinutes = h * 60 + m + (isBefore ? -beforeOff : afterOff);

    // Handle midnight wrap-around
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    if (totalMinutes >= 24 * 60) totalMinutes -= 24 * 60;

    const rH = Math.floor(totalMinutes / 60);
    const rM = totalMinutes % 60;
    return `${String(rH).padStart(2, '0')}:${String(rM).padStart(2, '0')}`;
};

const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Safe lazy reference to the expo-notifications module.
// We load it on first use to avoid crashing Expo Go at import time.
let _Notifications: any = null;
let _loadAttempted = false;

const getNotifications = (): any => {
    if (_Notifications) return _Notifications;
    if (_loadAttempted) return null;
    _loadAttempted = true;
    try {
        // require() is synchronous and Metro-friendly (no "unknown module" errors)
        _Notifications = require('expo-notifications');
        return _Notifications;
    } catch (e) {
        console.warn('expo-notifications could not be loaded:', e);
        return null;
    }
};

// Attempt to set up the notification handler (safe – won't crash if module missing)
try {
    const N = getNotifications();
    if (N && typeof N.setNotificationHandler === 'function') {
        N.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
            }),
        });
    }
} catch (_) {
    // Silently ignore – notifications just won't work in this environment
}

export const requestNotificationPermissions = async () => {
    if (Platform.OS === 'web') return false;

    const N = getNotifications();
    if (!N) return false;

    try {
        const { status: existingStatus } = await N.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await N.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') return false;

        if (Platform.OS === 'android' && typeof N.setNotificationChannelAsync === 'function') {
            const importance = N.AndroidImportance?.MAX ?? 5;
            const visibility = N.AndroidNotificationVisibility?.PUBLIC ?? 1;
            await N.setNotificationChannelAsync('medicine-alarms-v5', {
                name: 'Medicine Alarms',
                importance,
                sound: 'dawai_time',
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#4F46E5',
                lockscreenVisibility: visibility,
                bypassDnd: true,
            });
        }

        return true;
    } catch (e) {
        console.warn('requestNotificationPermissions failed:', e);
        return false;
    }
};

export const scheduleTestNotification = async () => {
    const N = getNotifications();
    if (!N || typeof N.scheduleNotificationAsync !== 'function') {
        Alert.alert('Not Available', 'Notifications are not available in this environment.');
        return;
    }

    // Ensure permissions first
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
        Alert.alert('Permission Required', 'Please enable notifications for MediPulse / Expo Go in your phone settings.');
        return;
    }

    const priority = N.AndroidNotificationPriority?.HIGH ?? 4;

    // Re-apply handler for foreground display
    if (typeof N.setNotificationHandler === 'function') {
        N.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
            }),
        });
    }

    const doSchedule = async () => {
        try {
            if (Platform.OS === 'android' && !isExpoGo) {
                // For test, trigger in 5 seconds
                const trigger = Date.now() + 5000;
                NativeAlarm.schedule(999999, trigger);
                Alert.alert('Scheduled! ✅', 'A native Alarms Activity will fire in 5 seconds. Stay here or lock your screen.');
                return;
            }

            const id = await N.scheduleNotificationAsync({
                content: {
                    title: 'Test Reminder! 🔔',
                    body: isExpoGo
                        ? 'This is a test notification (Default Sound).'
                        : 'This is your custom "Dawai Time" alarm!',
                    sound: isExpoGo ? undefined : 'dawai_time',
                    priority,
                    channelId: 'medicine-alarms-v5',
                },
                trigger: {
                    type: 'timeInterval',
                    seconds: 5,
                    repeats: false,
                } as any,
            });

            if (id) {
                Alert.alert('Scheduled! ✅', 'A notification will fire in 5 seconds. Stay here or lock your screen.');
            } else {
                Alert.alert('Error', 'The system could not schedule the notification.');
            }
        } catch (e: any) {
            Alert.alert('Scheduling Error', e?.message ?? 'Unknown error');
        }
    };

    if (isExpoGo) {
        Alert.alert(
            'Expo Go Test',
            'Custom sounds only work in Native Builds. Fire a standard test notification?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Fire Test', onPress: doSchedule },
            ],
        );
    } else {
        await doSchedule();
    }
};

export const scheduleMedicineReminders = async (medicine: Medicine) => {
    if (isExpoGo) return;

    if (Platform.OS === 'android') {
        const baseId = hashStringToInt(medicine._id);
        const slots = ['morning', 'afternoon', 'evening'];

        // 1. Cancel existing
        slots.forEach((_, idx) => NativeAlarm.cancel(baseId + idx));

        // 2. Schedule new
        if (!medicine.schedule?.slots) return;

        for (let i = 0; i < medicine.schedule.slots.length; i++) {
            const slot = medicine.schedule.slots[i];
            if (!slot.reminderTime) continue;

            const [hours, minutes] = slot.reminderTime.split(':').map(Number);
            const trigger = new Date();
            trigger.setHours(hours, minutes, 0, 0);

            if (trigger.getTime() <= Date.now()) {
                trigger.setDate(trigger.getDate() + 1);
            }

            NativeAlarm.schedule(baseId + i, trigger.getTime());
        }
        return;
    }

    const N = getNotifications();
    if (!N) return;

    await cancelMedicineReminders(medicine._id);
    // ... (rest of iOS logic if needed, currently focusing on Android hardening)
};

export const cancelMedicineReminders = async (medicineId: string) => {
    if (isExpoGo) return;

    if (Platform.OS === 'android') {
        const baseId = hashStringToInt(medicineId);
        [0, 1, 2].forEach(idx => NativeAlarm.cancel(baseId + idx));
        return;
    }

    const N = getNotifications();
    if (!N) return;
    const slots = ['morning', 'afternoon', 'evening'];
    for (const slot of slots) {
        try {
            await N.cancelScheduledNotificationAsync(`${medicineId}-${slot}`);
        } catch (_) { }
    }
};

export const rescheduleAllAlarms = async (medicines: Medicine[], mealTimings: MealTimings, alarmSettings: any) => {
    if (Platform.OS !== 'android' || isExpoGo) return;

    for (const med of medicines) {
        if (!med.isActive) {
            cancelMedicineReminders(med._id);
            continue;
        }

        // Recompute reminder times for slots that depend on meals
        const updatedSlots = med.schedule.slots.map(s => ({
            ...s,
            reminderTime: s.mealRelation
                ? computeReminderTime(s, mealTimings, {
                    beforeMinutes: alarmSettings.defaultBeforeOffset,
                    afterMinutes: alarmSettings.defaultAfterOffset
                })
                : s.reminderTime
        }));

        const recomputedMed = { ...med, schedule: { ...med.schedule, slots: updatedSlots } };
        scheduleMedicineReminders(recomputedMed);
    }
};

/**
 * Simple helper to generate unique numeric IDs for native alarms
 */
function hashStringToInt(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

export const cancelAllNotifications = async () => {
    if (isExpoGo) return;
    const N = getNotifications();
    if (!N) return;
    try {
        await N.cancelAllScheduledNotificationsAsync();
    } catch (_) { }
};

/**
 * Re-registers all active alarms for all patients.
 * Useful for syncing on app launch or after a fresh install.
 */
export const reRegisterAllActiveAlarms = async () => {
    if (Platform.OS !== 'android' || isExpoGo) return;

    try {
        const { patientService } = require('../services/patient.service');
        const { medicineService } = require('../services/medicine.service');

        const patients = await patientService.getAll();
        for (const patient of patients) {
            const medicines = await medicineService.getByPatient(patient._id);
            const activeMedicines = medicines.filter((m: any) => m.isActive);

            if (activeMedicines.length > 0) {
                await rescheduleAllAlarms(
                    activeMedicines,
                    patient.mealTimings || { breakfast: '08:00', lunch: '13:00', dinner: '20:00' },
                    patient.alarmSettings || {}
                );
            }
        }
        console.log('[NativeAlarm] Finished re-registering alarms for all patients.');
    } catch (e) {
        console.warn('reRegisterAllActiveAlarms failed:', e);
    }
};
