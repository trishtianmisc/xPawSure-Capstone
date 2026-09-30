import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Image, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useOwnerProfile } from '../../../features/profile/hooks/useOwnerProfile'
import { useAuth } from '../../../src/context/AuthContext'
import { useTheme } from '../../../src/context/ThemeContext'

export default function ProfileScreen() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { colors, isDark, toggleTheme } = useTheme()
  const { data: profile } = useOwnerProfile()

  const fullName = profile?.user.full_name || `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim()
  const email = profile?.user.email ?? user?.email ?? ''
  const phone = profile?.user.phone ?? ''
  const address = profile?.address ?? ''

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <View style={styles.header} />

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {profile?.profile_picture ? (
          <Image source={{ uri: profile.profile_picture }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatar}>
            <MaterialCommunityIcons color={colors.primary} name="account-circle" size={56} />
          </View>
        )}
        <Text style={[styles.name, { color: colors.text }]}>{fullName}</Text>
        <Text style={[styles.email, { color: colors.textSecondary }]}>{email}</Text>
        {!!phone && (
          <View style={styles.infoRow}>
            <MaterialCommunityIcons color={colors.textMuted} name="phone-outline" size={14} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{phone}</Text>
          </View>
        )}
        {!!address && (
          <View style={styles.infoRow}>
            <MaterialCommunityIcons color={colors.textMuted} name="map-marker-outline" size={14} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{address}</Text>
          </View>
        )}
        <Text style={[styles.role, { color: colors.primary }]}>{user?.role}</Text>
      </View>

      <Pressable
        onPress={() => router.push('/(owner)/profile/edit')}
        style={[styles.row, { backgroundColor: colors.surface }]}
      >
        <MaterialCommunityIcons color={colors.text} name="account-edit-outline" size={22} />
        <Text style={[styles.rowText, { color: colors.text }]}>Edit Profile</Text>
        <MaterialCommunityIcons color={colors.textSecondary} name="chevron-right" size={22} />
      </Pressable>

      <Pressable
        onPress={() => router.push('/(owner)/profile/change-password')}
        style={[styles.row, { backgroundColor: colors.surface }]}
      >
        <MaterialCommunityIcons color={colors.text} name="lock-outline" size={22} />
        <Text style={[styles.rowText, { color: colors.text }]}>Change Password</Text>
        <MaterialCommunityIcons color={colors.textSecondary} name="chevron-right" size={22} />
      </Pressable>

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
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8 },
  card: { alignItems: 'center', marginHorizontal: 24, borderRadius: 16, padding: 24, marginBottom: 24 },
  avatar: { marginBottom: 12 },
  avatarImage: { borderRadius: 40, height: 80, width: 80, marginBottom: 12 },
  name: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  email: { fontSize: 13, marginBottom: 4 },
  infoRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 4 },
  infoText: { fontSize: 13 },
  role: { fontSize: 12, fontWeight: '600', marginTop: 8, textTransform: 'capitalize' },
  row: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, borderRadius: 12, padding: 16, marginBottom: 12 },
  rowText: { flex: 1, fontSize: 15, fontWeight: '500', marginLeft: 12 },
})
