import { Stack } from 'expo-router';

export default function AppointmentsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Appointments' }} />
      <Stack.Screen name="[id]" options={{ title: 'Appointment Detail' }} />
    </Stack>
  );
}
