import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }

    if (isAuthenticated) {
        return <Redirect href="/(tabs)/patients" />;
    }

    return <Redirect href="/(auth)/login" />;
}
