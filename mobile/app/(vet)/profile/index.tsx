import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useVetProfile } from '../../../features/vet/hooks/useVetProfile'
import { formatPosition } from '../../../features/vet/lib/format'
import { useAuth } from '../../../src/context/AuthContext'
import { useTheme } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'

export default function VetProfileScreen() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { colors, isDark, toggleTheme } = useTheme()
  const { data: profile } = useVetProfile()

  const fullName = `${profile?.first_name ?? user?.first_name ?? ''} ${profile?.last_name ?? user?.last_name ?? ''}`.trim()
  const email = profile?.email ?? user?.email ?? ''
  const phone = profile?.phone ?? user?.phone ?? ''
  const position = formatPosition(profile?.position ?? user?.position)
  const clinicName = profile?.clinic_name ?? user?.clinic_name ?? ''
  const licenseNumber = profile?.license_number ?? user?.license_number ?? ''
  const licenseExpiration = profile?.license_expiration_date ?? user?.license_expiration_date ?? ''

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons color={colors.primary} name="account-circle" size={56} />
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{fullName || 'N/A'}</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{email || 'N/A'}</Text>
          {!!phone && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons color={colors.textMuted} name="phone-outline" size={14} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>{phone}</Text>
            </View>
          )}
          <Text style={[styles.role, { color: colors.primary }]}>{position}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.blockTitle, { color: colors.text }]}>Clinic Details</Text>
          {!!clinicName && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons color={colors.textMuted} name="hospital-building" size={14} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>{clinicName}</Text>
            </View>
          )}
          {!!licenseNumber && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons color={colors.textMuted} name="card-account-details-outline" size={14} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>{licenseNumber}</Text>
            </View>
          )}
          {!!licenseExpiration && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons color={colors.textMuted} name="calendar-outline" size={14} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                License expires {licenseExpiration}
              </Text>
            </View>
          )}
        </View>

        <Pressable
          onPress={() => router.push('/(vet)/profile/edit')}
          style={[styles.row, { backgroundColor: colors.surface }]}
        >
          <MaterialCommunityIcons color={colors.text} name="account-edit-outline" size={22} />
          <Text style={[styles.rowText, { color: colors.text }]}>Edit Profile</Text>
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
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingTop: 20, paddingBottom: 40 },
  card: { alignItems: 'center', marginHorizontal: 24, borderRadius: 16, padding: 24, marginBottom: 16 },
  avatar: { marginBottom: 12 },
  name: { ...font.bold, fontSize: 18, marginBottom: 4, textAlign: 'center' },
  email: { ...font.regular, fontSize: 13, marginBottom: 4, textAlign: 'center' },
  infoRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 4 },
  infoText: { ...font.regular, fontSize: 13 },
  role: { ...font.semibold, fontSize: 12, marginTop: 8, textTransform: 'capitalize' },
  blockTitle: { ...font.bold, fontSize: 15, marginBottom: 8, alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, borderRadius: 12, padding: 16, marginBottom: 12 },
  rowText: { ...font.medium, flex: 1, fontSize: 15, marginLeft: 12 },
})
