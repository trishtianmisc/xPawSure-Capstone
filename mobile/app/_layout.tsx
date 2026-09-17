import { QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

import { AuthProvider, useAuth } from '../src/context/AuthContext'
import { queryClient } from '../src/lib/queryClient'
import { ThemeProvider, useTheme } from '../src/context/ThemeContext'

function RootLayoutInner() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const { isDark } = useTheme()

  if (isLoading) return null

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="(auth)" />
        ) : user?.role === 'VETERINARIAN' ? (
          <Stack.Screen name="(vet)" />
        ) : (
          <Stack.Screen name="(owner)" />
        )}
      </Stack>
    </>
  )
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <RootLayoutInner />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
