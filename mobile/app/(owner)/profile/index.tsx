import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native'

import { useAuth } from '../../../src/context/AuthContext'
import { useTheme } from '../../../src/context/ThemeContext'

export default function ProfileScreen() {
  const { user, signOut } = useAuth()
  const { colors, isDark, toggleTheme } = useTheme()

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <View style={styles.header}>
        {/* <Text style={[styles.title, { color: colors.text }]}>Profile</Text> */}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.avatar}>
          <MaterialCommunityIcons color={colors.primary} name="account-circle" size={56} />
        </View>
        <Text style={[styles.name, { color: colors.text }]}>
          {user?.first_name} {user?.last_name}
        </Text>
        <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email}</Text>
        <Text style={[styles.role, { color: colors.primary }]}>{user?.role}</Text>
      </View>

      <Pressable onPress={toggleTheme} style={[styles.row, { backgroundColor: colors.surface }]}>
        <MaterialCommunityIcons color={colors.text} name={isDark ? 'weather-sunny' : 'weather-night'} size={22} />
        <Text style={[styles.rowText, { color: colors.text }]}>
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </Text>
        <MaterialCommunityIcons color={colors.textSecondary} name="chevron-right" size={22} />
      </Pressable>

      <Pressable onPress={signOut} style={[styles.row, { backgroundColor: colors.surface }]}>
        <MaterialCommunityIcons color={colors.error} name="logout" size={22} />
        <Text style={[styles.rowText, { color: colors.error }]}>Sign Out</Text>
      </Pressable>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: '800' },
  card: { alignItems: 'center', marginHorizontal: 24, borderRadius: 16, padding: 24, marginBottom: 24 },
  avatar: { marginBottom: 12 },
  name: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  email: { fontSize: 13, marginBottom: 4 },
  role: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, borderRadius: 12, padding: 16, marginBottom: 12 },
  rowText: { flex: 1, fontSize: 15, fontWeight: '500', marginLeft: 12 },
})
