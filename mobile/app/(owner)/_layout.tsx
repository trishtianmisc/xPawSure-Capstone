import { Ionicons } from '@expo/vector-icons'
import { Redirect, Tabs } from 'expo-router'
import { View } from 'react-native'

import { AppHeader } from '../../src/components/AppHeader'
import { useAuth } from '../../src/context/AuthContext'
import { useTheme } from '../../src/context/ThemeContext'

export default function OwnerTabLayout() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const { colors } = useTheme()

  if (isLoading) return null
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />
  if (user?.role !== 'OWNER') return <Redirect href="/(vet)/" />

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader />
      <Tabs screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarStyle: { backgroundColor: colors.tabBg, borderTopColor: colors.tabBorder, height: 64, paddingTop: 5 },
      }}>
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={20} color={color} /> }} />
        <Tabs.Screen name="pets" options={{ title: 'My Pets', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'paw' : 'paw-outline'} size={20} color={color} /> }} />
        <Tabs.Screen name="appointments" options={{ title: 'Appointments', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={20} color={color} /> }} />
        <Tabs.Screen name="records" options={{ title: 'Records', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'folder' : 'folder-outline'} size={20} color={color} /> }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={20} color={color} /> }} />
      </Tabs>
    </View>
  )
}
