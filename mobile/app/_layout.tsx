import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/lib/queryClient';
import { AuthProvider } from '../src/context/AuthContext';
import { PatientProvider } from '../src/context/PatientContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { useEffect } from 'react';
import { requestNotificationPermissions } from '../src/utils/notifications';
import { Colors } from '../src/constants/Colors';
import { StatusBar } from 'expo-status-bar';

function AppContent() {
  const { theme: activeTheme } = useTheme();
  const theme = Colors[activeTheme];

  useEffect(() => {
    const initAlarms = async () => {
      await requestNotificationPermissions();

      // On Android 12+, we need to check if we can schedule exact alarms
      if (Platform.OS === 'android' && Platform.Version >= 31) {
        // If exact alarm permission is denied, alarms might be delayed.
        // In a medical app, we should ideally prompt the user to enable it in settings.
      }

      // Sync all active alarms with the native engine
      const { reRegisterAllActiveAlarms } = require('../src/utils/notifications');
      await reRegisterAllActiveAlarms();
    };
    initAlarms();
  }, []);

  return (
    <>
      <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.primary,
        headerTitleStyle: { fontWeight: '700', color: theme.text },
        headerShadowVisible: false,
      }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="patients/add" options={{ presentation: 'modal', headerShown: true, title: 'Add Patient' }} />
        <Stack.Screen name="medicines/add" options={{ presentation: 'modal', headerShown: true, title: 'Add Medicine' }} />
        <Stack.Screen name="health/add" options={{ presentation: 'modal', headerShown: true, title: 'Log Health Metric' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <PatientProvider>
            <AppContent />
          </PatientProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
