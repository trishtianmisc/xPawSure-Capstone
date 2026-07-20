import { Stack } from 'expo-router'

export default function ConsultationsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Consultations' }} />
      <Stack.Screen name="[id]" options={{ title: 'Consultation' }} />
    </Stack>
  )
}
