import { Stack } from 'expo-router';

export default function ScreeningsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Screening History' }} />
    </Stack>
  );
}
