import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'

import { useAuth } from '../../src/context/AuthContext'
import { useTheme, type AppColors } from '../../src/context/ThemeContext'
import { font } from '../../src/theme/typography'
import { usePullToRefresh } from '../../features/vet/hooks/usePullToRefresh'
import { useRefreshVetOnFocus } from '../../features/vet/hooks/useRefreshVetOnFocus'
import { useVetDashboard } from '../../features/vet/hooks/useVetDashboard'
import { formatAppointmentStatus, formatTime, localDateStr } from '../../features/vet/lib/format'
import type { AppointmentStatus } from '../../features/vet/types'

const STATUS_COLORS: Record<AppointmentStatus, { bg: string; text: string }> = {
  PENDING: { bg: '#FDEBD0', text: '#E67E22' },
  CONFIRMED: { bg: '#D5F5E3', text: '#27AE60' },
  CHECKED_IN: { bg: '#FCF3CF', text: '#B7950B' },
  IN_PROGRESS: { bg: '#E8DAEF', text: '#6C3483' },
  COMPLETED: { bg: '#D6EAF8', text: '#2E86C1' },
  CANCELLED: { bg: '#FADBD8', text: '#E74C3C' },
  NO_SHOW: { bg: '#FADBD8', text: '#E74C3C' },
}

export default function VetHomeScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { colors, isDark } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { data, isLoading, isError, refetch } = useVetDashboard(localDateStr())
  const { refreshing, onRefresh } = usePullToRefresh(refetch)
  useRefreshVetOnFocus('dashboard')
  const firstName = user?.first_name || 'Vet'

  const stats = data?.stats
  const schedule = (data?.today_consultations ?? []).map((apt) => ({
    id: apt.apt_id,
    time: formatTime(apt.apt_scheduled_at),
    pet_name: apt.pet_name,
    breed: apt.pet_breed ?? apt.pet_species ?? '',
    owner_name: apt.owner_name ?? '',
    ai_screening_tag: apt.screening ? apt.screening.disease : null,
    status: apt.apt_status,
  }))

  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

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
          <Text style={styles.summaryDate}>{dateStr}</Text>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : isError || !stats ? (
            <Text style={styles.emptyText}>Unable to load today&apos;s summary.</Text>
          ) : (
            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: '#EBF5FB' }]}>
                <Text style={[styles.statValue, { color: '#2E86C1' }]}>{stats.consultations_this_month}</Text>
                <Text style={styles.statLabel}>Consultations</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: '#D5F5E3' }]}>
                <Text style={[styles.statValue, { color: '#27AE60' }]}>{stats.completed}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: '#FDEBD0' }]}>
                <Text style={[styles.statValue, { color: '#E67E22' }]}>{stats.pending}</Text>
                <Text style={styles.statLabel}>Remaining</Text>
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
          schedule.map((item) => {
            const statusStyle = STATUS_COLORS[item.status]
            return (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/(vet)/consultations/${item.id}`)}
                style={({ pressed }) => [styles.scheduleCard, pressed && styles.scheduleCardPressed]}
              >
                <View style={styles.scheduleTimeCol}>
                  <Text style={styles.scheduleTime}>{item.time}</Text>
                </View>
                <View style={styles.scheduleDivider} />
                <View style={styles.scheduleInfoCol}>
                  <View style={styles.schedulePetRow}>
                    <Text style={styles.schedulePetName} numberOfLines={1}>{item.pet_name}</Text>
                    {!!item.breed && <Text style={styles.scheduleBreed} numberOfLines={1}> | {item.breed}</Text>}
                  </View>
                  <Text style={styles.scheduleOwner}>{item.owner_name}</Text>
                  {item.ai_screening_tag && (
                    <Text style={styles.scheduleAiTag}>AI: {item.ai_screening_tag}</Text>
                  )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
                    {formatAppointmentStatus(item.status)}
                  </Text>
                </View>
              </Pressable>
            )
          })
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
  statLabel: { ...font.semibold, color: colors.textSecondary, fontSize: 11, marginTop: 4 },

  loading: { marginVertical: 20 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { ...font.bold, color: colors.text, fontSize: 17 },

  scheduleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.borderLight },
  scheduleCardPressed: { opacity: 0.7 },
  scheduleTimeCol: { width: 70 },
  scheduleTime: { ...font.bold, color: colors.text, fontSize: 13 },
  scheduleDivider: { width: 3, height: 40, backgroundColor: colors.primary, borderRadius: 2, marginHorizontal: 12 },
  scheduleInfoCol: { flex: 1 },
  schedulePetRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  schedulePetName: { ...font.bold, color: colors.text, fontSize: 15 },
  scheduleBreed: { ...font.regular, color: colors.textSecondary, fontSize: 13, flexShrink: 1 },
  scheduleOwner: { ...font.regular, color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  scheduleAiTag: { ...font.semibold, color: colors.primary, fontSize: 11, marginTop: 4 },

  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
})
