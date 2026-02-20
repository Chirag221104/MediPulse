import { Tabs, Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { Colors } from '../../src/constants/Colors';

export default function TabsLayout() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { mode, setMode, theme: activeTheme } = useTheme();
  const theme = Colors[activeTheme];

  const toggleTheme = () => {
    setMode(activeTheme === 'dark' ? 'light' : 'dark');
  };

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.inactive,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopWidth: 1,
          borderTopColor: theme.border
        },
        headerStyle: { backgroundColor: theme.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, gap: 12 }}>
            <TouchableOpacity onPress={() => router.push('/settings')} style={{ padding: 4 }}>
              <Ionicons
                name="settings-outline"
                size={22}
                color="#fff"
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleTheme} style={{ padding: 4 }}>
              <Ionicons
                name={activeTheme === 'dark' ? 'sunny' : 'moon'}
                size={22}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="patients"
        options={{
          title: 'Patients',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="medicines"
        options={{
          title: 'Medicines',
          tabBarIcon: ({ color, size }) => <Ionicons name="medkit" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: 'Health',
          tabBarIcon: ({ color, size }) => <Ionicons name="heart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
