import { Stack } from 'expo-router';

export default function EditPetLayout() {
  return (
    <Stack>
      <Stack.Screen name="[id]" options={{ title: 'Edit Pet' }} />
    </Stack>
  );
}
