import { Redirect, Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { useAuth } from '../../src/context/AuthContext'
import { useTheme } from '../../src/context/ThemeContext'

export default function VetTabLayout() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const { colors } = useTheme()

  if (isLoading) return null

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />

  if (user?.role !== 'VETERINARIAN') return <Redirect href="/(owner)/" />

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: colors.tabActive,
      tabBarInactiveTintColor: colors.tabInactive,
      tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      tabBarStyle: { backgroundColor: colors.tabBg, borderTopColor: colors.tabBorder, height: 64, paddingTop: 5 },
    }}>
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Appointments',
          tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="consultations"
        options={{
          title: 'Consultations',
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
