import { Stack } from 'expo-router';

export default function PetsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Pets' }} />
      <Stack.Screen name="[id]" options={{ title: 'Pet Detail' }} />
      <Stack.Screen name="new" options={{ title: 'New Pet' }} />
    </Stack>
  );
}
