import { Stack } from 'expo-router';

export default function RecordsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Medical Records' }} />
      <Stack.Screen name="consultations/[id]" options={{ title: 'Consultation Detail' }} />
      <Stack.Screen name="prescriptions/[id]" options={{ title: 'Prescription Detail' }} />
      <Stack.Screen name="vaccinations/[id]" options={{ title: 'Vaccination Detail' }} />
    </Stack>
  );
}
