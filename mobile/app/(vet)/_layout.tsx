import { Redirect, Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { AppState, View } from 'react-native'

import { AppHeader } from '../../src/components/AppHeader'
import { useAuth } from '../../src/context/AuthContext'
import { useTheme } from '../../src/context/ThemeContext'
import { font } from '../../src/theme/typography'

export default function VetTabLayout() {
  const { colors } = useTheme()
  const { isLoading, isAuthenticated, user } = useAuth()
  const queryClient = useQueryClient()
  const appState = useRef(AppState.currentState)

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current === 'background' && nextState === 'active') {
        void queryClient.invalidateQueries({ queryKey: ['vet'] })
      }
      appState.current = nextState
    })

    return () => subscription.remove()
  }, [queryClient])

  if (isLoading) return null
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />
  if (user?.role !== 'VETERINARIAN') return <Redirect href="/(owner)/" />

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader />
      <Tabs screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: { fontSize: 10, ...font.semibold },
        tabBarStyle: { backgroundColor: colors.tabBg, borderTopColor: colors.tabBorder, height: 100, paddingTop: 8, paddingBottom: 50 },
      }}>
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={20} color={color} /> }} />
        <Tabs.Screen name="consultations" options={{ title: 'Consultations', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={20} color={color} /> }} />
        <Tabs.Screen name="schedule" options={{ title: 'Schedule', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={20} color={color} /> }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={20} color={color} /> }} />
        
      </Tabs>
    </View>
  )
}
