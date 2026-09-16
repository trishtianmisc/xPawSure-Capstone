import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useMemo } from 'react'
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'

import { useAuth } from '../../src/context/AuthContext'
import { useTheme, type AppColors } from '../../src/context/ThemeContext'
import { MOCK_VET_DASHBOARD } from '../../features/vet/data/mock'
import type { AppointmentStatus } from '../../features/vet/types'

const STATUS_COLORS: Record<AppointmentStatus, { bg: string; text: string }> = {
  PENDING: { bg: '#FDEBD0', text: '#E67E22' },
  CONFIRMED: { bg: '#D5F5E3', text: '#27AE60' },
  COMPLETED: { bg: '#D6EAF8', text: '#2E86C1' },
  CANCELLED: { bg: '#FADBD8', text: '#E74C3C' },
  NO_SHOW: { bg: '#FADBD8', text: '#E74C3C' },
}

export default function VetHomeScreen() {
  const { user } = useAuth()
  const { colors, isDark } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const data = MOCK_VET_DASHBOARD
  const firstName = user?.first_name || 'Vet'

  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={styles.safeArea.backgroundColor} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: '#EBF5FB' }]}>
              <Text style={[styles.statValue, { color: '#2E86C1' }]}>{data.stats.consultations}</Text>
              <Text style={styles.statLabel}>Consultations</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#D5F5E3' }]}>
              <Text style={[styles.statValue, { color: '#27AE60' }]}>{data.stats.completed}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#FDEBD0' }]}>
              <Text style={[styles.statValue, { color: '#E67E22' }]}>{data.stats.remaining}</Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today&apos;s Schedule</Text>
        </View>

        {data.todaySchedule.map((item) => {
          const statusStyle = STATUS_COLORS[item.status]
          return (
            <View key={item.id} style={styles.scheduleCard}>
              <View style={styles.scheduleTimeCol}>
                <Text style={styles.scheduleTime}>{item.time}</Text>
              </View>
              <View style={styles.scheduleDivider} />
              <View style={styles.scheduleInfoCol}>
                <View style={styles.schedulePetRow}>
                  <Text style={styles.schedulePetName} numberOfLines={1}>{item.pet_name}</Text>
                  <Text style={styles.scheduleBreed} numberOfLines={1}> | {item.breed}</Text>
                </View>
                <Text style={styles.scheduleOwner}>{item.owner_name}</Text>
                {item.ai_screening_tag && (
                  <Text style={styles.scheduleAiTag}>{item.ai_screening_tag}</Text>
                )}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{item.status}</Text>
              </View>
            </View>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  welcome: { color: colors.text, fontSize: 22, fontWeight: '800', lineHeight: 28 },

  summaryCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: colors.borderLight },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  summaryTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  summaryDate: { color: colors.textSecondary, fontSize: 13, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '600', marginTop: 4 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },

  scheduleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.borderLight },
  scheduleTimeCol: { width: 70 },
  scheduleTime: { color: colors.text, fontSize: 13, fontWeight: '700' },
  scheduleDivider: { width: 3, height: 40, backgroundColor: colors.primary, borderRadius: 2, marginHorizontal: 12 },
  scheduleInfoCol: { flex: 1 },
  schedulePetRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  schedulePetName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  scheduleBreed: { color: colors.textSecondary, fontSize: 13, flexShrink: 1 },
  scheduleOwner: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  scheduleAiTag: { color: colors.primary, fontSize: 11, fontWeight: '600', marginTop: 4 },

  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
})
