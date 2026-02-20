import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getItemAsync, setItemAsync, deleteItemAsync } from '../utils/storage';
import { authService, AuthResponse } from '../services/auth.service';
import { setAccessToken } from '../services/api';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

interface User {
    _id: string;
    name: string;
    email: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const registerDeviceToken = useCallback(async () => {
        if (Platform.OS === 'web' || isExpoGo) return;

        try {
            const Notifications = await import('expo-notifications');
            const token = (await Notifications.getDevicePushTokenAsync()).data;
            await authService.registerFcmToken(token);
            console.log('FCM Token registered successfully:', token);
        } catch (error) {
            console.warn('Failed to register FCM token:', error);
        }
    }, []);

    const handleAuthSuccess = useCallback(async (result: AuthResponse) => {
        setAccessToken(result.accessToken);
        await setItemAsync('refreshToken', result.refreshToken);
        await setItemAsync('user', JSON.stringify(result.user));
        setUser(result.user);
    }, []);

    // On mount: attempt to restore session from persisted refresh token
    useEffect(() => {
        const restoreSession = async () => {
            try {
                const refreshToken = await getItemAsync('refreshToken');
                if (!refreshToken) {
                    setIsLoading(false);
                    return;
                }

                const result = await authService.refreshToken(refreshToken);
                setAccessToken(result.accessToken);

                if (result.refreshToken) {
                    await setItemAsync('refreshToken', result.refreshToken);
                }

                // Decode user from stored data
                const storedUser = await getItemAsync('user');
                if (storedUser) {
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                    registerDeviceToken(); // Register token on session restore
                }
            } catch {
                // Refresh failed → clean up
                await deleteItemAsync('refreshToken');
                await deleteItemAsync('user');
                setAccessToken(null);
            } finally {
                setIsLoading(false);
            }
        };

        restoreSession();
    }, [registerDeviceToken]);

    const login = useCallback(async (email: string, password: string) => {
        const result = await authService.login(email.trim().toLowerCase(), password.trim());
        await handleAuthSuccess(result);
        registerDeviceToken();
    }, [handleAuthSuccess, registerDeviceToken]);

    const register = useCallback(async (name: string, email: string, password: string) => {
        const result = await authService.register(name.trim(), email.trim().toLowerCase(), password.trim());
        await handleAuthSuccess(result);
        registerDeviceToken();
    }, [handleAuthSuccess, registerDeviceToken]);

    const logout = useCallback(async () => {
        try {
            const refreshToken = await getItemAsync('refreshToken');
            if (refreshToken) {
                await authService.logout(refreshToken);
            }
        } catch {
            // Ignore logout errors
        } finally {
            setAccessToken(null);
            setUser(null);
            await deleteItemAsync('refreshToken');
            await deleteItemAsync('user');
        }
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                register,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
