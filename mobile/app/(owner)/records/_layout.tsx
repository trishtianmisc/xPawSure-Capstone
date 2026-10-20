import { Stack } from 'expo-router';

export default function RecordsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="consultations/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="prescriptions/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="vaccinations/[id]" options={{ headerShown: false}} />
      <Stack.Screen name="vaccinations/new" options={{ headerShown: false}} />
      <Stack.Screen name="vaccinations/edit/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
