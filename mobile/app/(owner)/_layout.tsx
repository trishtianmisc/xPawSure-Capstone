import { Redirect, Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { useAuth } from '../../src/context/AuthContext'

export default function OwnerTabLayout() {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) return null

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />

  if (user?.role !== 'OWNER') return <Redirect href="/(vet)/" />

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#b45309' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pets"
        options={{
          title: 'Pets',
          tabBarIcon: ({ color, size }) => <Ionicons name="paw" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Appointments',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: 'Records',
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
