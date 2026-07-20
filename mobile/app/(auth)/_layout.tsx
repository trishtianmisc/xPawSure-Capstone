import { Redirect, Stack } from 'expo-router'
import { useAuth } from '../../src/context/AuthContext'

export default function AuthLayout() {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) return null

  if (isAuthenticated) {
    if (user?.role === 'VETERINARIAN') {
      return <Redirect href="/(vet)/" />
    }
    return <Redirect href="/(owner)/" />
  }

  return (
    <Stack initialRouteName="index" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  )
}
