import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
    mode: ThemeMode;
    setMode: (mode: ThemeMode) => void;
    theme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemColorScheme = useColorScheme() ?? 'light';
    const [mode, setModeState] = useState<ThemeMode>('system');

    useEffect(() => {
        SecureStore.getItemAsync('theme_mode').then((savedMode) => {
            if (savedMode) {
                setModeState(savedMode as ThemeMode);
            }
        });
    }, []);

    const setMode = async (newMode: ThemeMode) => {
        setModeState(newMode);
        await SecureStore.setItemAsync('theme_mode', newMode);
    };

    const theme = mode === 'system' ? systemColorScheme : mode;

    return (
        <ThemeContext.Provider value={{ mode, setMode, theme: theme as 'light' | 'dark' }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
