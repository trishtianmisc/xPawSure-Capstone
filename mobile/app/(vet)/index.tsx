import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { ActivityIndicator, RefreshControl, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'

import { useAuth } from '../../src/context/AuthContext'
import { useTheme, type AppColors } from '../../src/context/ThemeContext'
import { font } from '../../src/theme/typography'
import { VetAppointmentCard } from '../../features/vet/components/VetAppointmentCard'
import { usePullToRefresh } from '../../features/vet/hooks/usePullToRefresh'
import { useRefreshVetOnFocus } from '../../features/vet/hooks/useRefreshVetOnFocus'
import { useVetDashboard } from '../../features/vet/hooks/useVetDashboard'
import { formatTime } from '../../features/vet/lib/format'
import { formatDate, manilaDateKey } from '../../src/utils/datetime'

const STAT_STYLES = {
  light: {
    consultations: { bg: '#E8F1FA', text: '#2C6CA8' },
    upcoming: { bg: '#FCF0DB', text: '#B26B12' },
    completed: { bg: '#E6F5EC', text: '#1E8750' },
  },
  dark: {
    consultations: { bg: '#1A2A3A', text: '#8CBBEA' },
    upcoming: { bg: '#332515', text: '#F0B45C' },
    completed: { bg: '#16301F', text: '#74D69C' },
  },
} as const

export default function VetHomeScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { colors, isDark } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const statStyles = STAT_STYLES[isDark ? 'dark' : 'light']
  const { data, isLoading, isError, refetch } = useVetDashboard(manilaDateKey())
  const { refreshing, onRefresh } = usePullToRefresh(refetch)
  useRefreshVetOnFocus('dashboard')
  const firstName = user?.first_name || 'Vet'

  const stats = data?.stats
  const schedule = (data?.today_consultations ?? []).map((apt) => ({
    id: apt.apt_id,
    time: formatTime(apt.apt_scheduled_at),
    pet_name: apt.pet_name,
    breed: apt.pet_breed ?? apt.pet_species ?? '',
    pet_profile_image: apt.pet_profile_image ?? null,
    status: apt.apt_status,
  }))

  const todayStr = formatDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const pendingToday = stats ? stats.today_stats.confirmed + stats.today_stats.ongoing : 0

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={styles.safeArea.backgroundColor} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>Welcome Back {firstName}!</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <MaterialCommunityIcons color={colors.primary} name="calendar-check" size={18} />
            <Text style={styles.summaryTitle}>Today&apos;s Summary</Text>
          </View>
          <Text style={styles.summaryDate}>{todayStr}</Text>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : isError || !stats ? (
            <Text style={styles.emptyText}>Unable to load today&apos;s summary.</Text>
          ) : (
            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: statStyles.consultations.bg }]}>
                <Text style={[styles.statValue, { color: statStyles.consultations.text }]}>{stats.today_stats.total}</Text>
                <Text style={[styles.statLabel, { color: statStyles.consultations.text }]}>Consultations</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: statStyles.upcoming.bg }]}>
                <Text style={[styles.statValue, { color: statStyles.upcoming.text }]}>{pendingToday}</Text>
                <Text style={[styles.statLabel, { color: statStyles.upcoming.text }]}>Upcoming</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: statStyles.completed.bg }]}>
                <Text style={[styles.statValue, { color: statStyles.completed.text }]}>{stats.today_stats.completed}</Text>
                <Text style={[styles.statLabel, { color: statStyles.completed.text }]}>Completed</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today&apos;s Schedule</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : schedule.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No appointments scheduled for today.</Text>
          </View>
        ) : (
          schedule.map((item) => (
            <VetAppointmentCard
              breed={item.breed}
              imageUrl={item.pet_profile_image}
              key={item.id}
              meta={item.time}
              onPress={() => router.push(`/(vet)/consultations/${item.id}`)}
              petName={item.pet_name}
              status={item.status}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  welcome: { ...font.extrabold, color: colors.text, fontSize: 22, lineHeight: 28 },

  summaryCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: colors.borderLight },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  summaryTitle: { ...font.bold, color: colors.text, fontSize: 16 },
  summaryDate: { ...font.regular, color: colors.textSecondary, fontSize: 13, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  statValue: { ...font.extrabold, fontSize: 24 },
  statLabel: { ...font.semibold, fontSize: 11, marginTop: 4 },

  loading: { marginVertical: 20 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { ...font.bold, color: colors.text, fontSize: 17 },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
})
