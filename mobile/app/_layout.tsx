import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

import { AuthProvider } from '../src/context/AuthContext'
import { ThemeProvider, useTheme } from '../src/context/ThemeContext'

const queryClient = new QueryClient()

function RootLayoutInner() {
  const { isDark } = useTheme()
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(owner)" />
        <Stack.Screen name="(vet)" />
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
