import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Platform-aware storage abstraction.
 * - Native (iOS/Android): Uses expo-secure-store (encrypted).
 * - Web: Uses localStorage (unencrypted, but functional).
 */

export async function getItemAsync(key: string): Promise<string | null> {
    try {
        if (Platform.OS === 'web') {
            return localStorage.getItem(key);
        }
        return await SecureStore.getItemAsync(key);
    } catch (e) {
        console.warn(`Storage getItemAsync failed for key ${key}:`, e);
        return null;
    }
}

export async function setItemAsync(key: string, value: string): Promise<void> {
    try {
        if (Platform.OS === 'web') {
            localStorage.setItem(key, value);
            return;
        }
        await SecureStore.setItemAsync(key, value);
    } catch (e) {
        console.warn(`Storage setItemAsync failed for key ${key}:`, e);
    }
}

export async function deleteItemAsync(key: string): Promise<void> {
    try {
        if (Platform.OS === 'web') {
            localStorage.removeItem(key);
            return;
        }
        await SecureStore.deleteItemAsync(key);
    } catch (e) {
        console.warn(`Storage deleteItemAsync failed for key ${key}:`, e);
    }
}
