import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authService, AuthResponse } from '../services/auth.service';
import { setAccessToken } from '../services/api';

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

    // On mount: attempt to restore session from persisted refresh token
    useEffect(() => {
        const restoreSession = async () => {
            try {
                const refreshToken = await SecureStore.getItemAsync('refreshToken');
                if (!refreshToken) {
                    setIsLoading(false);
                    return;
                }

                const result = await authService.refreshToken(refreshToken);
                setAccessToken(result.accessToken);

                if (result.refreshToken) {
                    await SecureStore.setItemAsync('refreshToken', result.refreshToken);
                }

                // Decode user from stored data
                const storedUser = await SecureStore.getItemAsync('user');
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            } catch {
                // Refresh failed → clean up
                await SecureStore.deleteItemAsync('refreshToken');
                await SecureStore.deleteItemAsync('user');
                setAccessToken(null);
            } finally {
                setIsLoading(false);
            }
        };

        restoreSession();
    }, []);

    const handleAuthSuccess = useCallback(async (result: AuthResponse) => {
        setAccessToken(result.accessToken);
        await SecureStore.setItemAsync('refreshToken', result.refreshToken);
        await SecureStore.setItemAsync('user', JSON.stringify(result.user));
        setUser(result.user);
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const result = await authService.login(email.trim().toLowerCase(), password.trim());
        await handleAuthSuccess(result);
    }, [handleAuthSuccess]);

    const register = useCallback(async (name: string, email: string, password: string) => {
        const result = await authService.register(name.trim(), email.trim().toLowerCase(), password.trim());
        await handleAuthSuccess(result);
    }, [handleAuthSuccess]);

    const logout = useCallback(async () => {
        try {
            const refreshToken = await SecureStore.getItemAsync('refreshToken');
            if (refreshToken) {
                await authService.logout(refreshToken);
            }
        } catch {
            // Ignore logout errors
        } finally {
            setAccessToken(null);
            setUser(null);
            await SecureStore.deleteItemAsync('refreshToken');
            await SecureStore.deleteItemAsync('user');
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
