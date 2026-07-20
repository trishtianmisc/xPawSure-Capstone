import { Stack } from 'expo-router';

export default function ScreeningLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Capture' }} />
      <Stack.Screen name="result" options={{ title: 'Result' }} />
    </Stack>
  );
}
