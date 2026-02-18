import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/lib/queryClient';
import { AuthProvider } from '../src/context/AuthContext';
import { PatientProvider } from '../src/context/PatientContext';

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PatientProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="patients/add" options={{ presentation: 'modal', headerShown: true, title: 'Add Patient' }} />
            <Stack.Screen name="medicines/add" options={{ presentation: 'modal', headerShown: true, title: 'Add Medicine' }} />
            <Stack.Screen name="health/add" options={{ presentation: 'modal', headerShown: true, title: 'Log Health Metric' }} />
          </Stack>
        </PatientProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
