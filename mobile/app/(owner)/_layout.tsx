import { Ionicons } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'
import { Redirect, Tabs } from 'expo-router'
import { useEffect, useRef } from 'react'
import { AppState, InteractionManager, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppHeader } from '../../src/components/AppHeader'
import { useAuth } from '../../src/context/AuthContext'
import { useTheme } from '../../src/context/ThemeContext'
import { preloadModel } from '../../ai/services/tensorflow.service'
import { font } from '../../src/theme/typography'

const OWNER_REFRESH_QUERY_KEYS = [
  ['appointment'],
  ['consultations'],
  ['consultation'],
  ['screening'],
  ['prescriptions'],
  ['vaccinations'],
] as const

export default function OwnerTabLayout() {
  const { colors } = useTheme()
  const { isLoading, isAuthenticated, user } = useAuth()
  const queryClient = useQueryClient()
  const insets = useSafeAreaInsets()
  const appState = useRef(AppState.currentState)

  useEffect(() => {
    preloadModel()
    const task = InteractionManager.runAfterInteractions(() => {
      preloadModel()
    })
    return () => {
      task.cancel()
    }
  }, [])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current === 'background' && nextState === 'active') {
        for (const queryKey of OWNER_REFRESH_QUERY_KEYS) {
          void queryClient.invalidateQueries({ queryKey })
        }
      }
      appState.current = nextState
    })

    return () => subscription.remove()
  }, [queryClient])

  if (isLoading) return null
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />
  if (user?.role === 'VETERINARIAN') return <Redirect href="/(vet)/" />

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader />
      <Tabs screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: { fontSize: 10, ...font.semibold },
        tabBarStyle: { backgroundColor: colors.tabBg, borderTopColor: colors.tabBorder, height: 64 + insets.bottom, paddingTop: 5 },
      }}>
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={20} color={color} /> }} />
        <Tabs.Screen name="pets" options={{ title: 'My Pets', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'paw' : 'paw-outline'} size={20} color={color} /> }} />
        <Tabs.Screen name="appointments" options={{ title: 'Appointments', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={20} color={color} /> }} />
        <Tabs.Screen
          name="records"
          options={{
            title: 'Records',
            popToTopOnBlur: true,
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'folder' : 'folder-outline'} size={20} color={color} />,
          }}
        />
        <Tabs.Screen name="notifications/index" options={{ href: null }} />
        <Tabs.Screen name="payments/index" options={{ href: null }} />
        <Tabs.Screen name="screenings" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={20} color={color} /> }} />
      </Tabs>
    </View>
  )
}
