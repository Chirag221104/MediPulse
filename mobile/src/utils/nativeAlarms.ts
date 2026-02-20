import { NativeModules, Platform } from 'react-native';

const { AlarmModule } = NativeModules;

export interface AlarmData {
    id: number;
    timestamp: number; // UTC Epoch Millis
}

export const NativeAlarm = {
    /**
     * Schedules a native exact alarm.
     * @param id Unique ID for the alarm slot
     * @param timestamp Absolute UTC epoch milliseconds
     */
    schedule: (id: number, timestamp: number) => {
        if (Platform.OS === 'android' && AlarmModule) {
            AlarmModule.scheduleAlarm(id, timestamp);
            console.log(`[NativeAlarm] Scheduled alarm ${id} for ${new Date(timestamp).toLocaleString()}`);
        }
    },

    /**
     * Cancels an existing native alarm.
     */
    cancel: (id: number) => {
        if (Platform.OS === 'android' && AlarmModule) {
            AlarmModule.cancelAlarm(id);
        }
    },
    checkExactAlarmPermission: async (): Promise<boolean> => {
        if (Platform.OS === 'android' && AlarmModule?.checkExactAlarmPermission) {
            return await AlarmModule.checkExactAlarmPermission();
        }
        return true;
    }
};

/**
 * Force-Stop Recovery: Fetch all medicines and re-schedule alarms.
 * Should be called on app launch.
 */
export const recoverAlarms = async (medicines: any[]) => {
    if (Platform.OS !== 'android') return;

    console.log('[NativeAlarm] Starting recovery for', medicines.length, 'medicines');

    medicines.forEach(med => {
        // Here you would compute the NEXT trigger time for this medicine
        // and call NativeAlarm.schedule(uniqueId, nextTriggerMillis)
        // For simplicity, we'll implement this logic in the respective screens
        // or a shared hook.
    });
};
