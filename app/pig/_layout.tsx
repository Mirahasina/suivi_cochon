import { Stack } from 'expo-router';
import { Colors } from '../../constants/theme';

export default function PigLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: Colors.primary },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' },
            }}
        >
            <Stack.Screen name="[id]" options={{ headerShown: false }} />
            <Stack.Screen name="edit/[id]" options={{ title: 'Modifier le cochon' }} />
        </Stack>
    );
}
