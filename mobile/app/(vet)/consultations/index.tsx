import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'
import { useVetAppointments } from '../../../features/vet/hooks/useVetAppointments'
import { formatShortDate, formatTime, localDateStr } from '../../../features/vet/lib/format'
import type { AppointmentStatus, ConsultationTab } from '../../../features/vet/types'

const TABS: ConsultationTab[] = ['TODAY', 'UPCOMING', 'COMPLETED']

const STATUS_COLORS: Record<AppointmentStatus, { bg: string; text: string }> = {
  PENDING: { bg: '#FDEBD0', text: '#E67E22' },
  CONFIRMED: { bg: '#D5F5E3', text: '#27AE60' },
  CHECKED_IN: { bg: '#FCF3CF', text: '#B7950B' },
  IN_PROGRESS: { bg: '#E8DAEF', text: '#6C3483' },
  COMPLETED: { bg: '#D6EAF8', text: '#2E86C1' },
  CANCELLED: { bg: '#FADBD8', text: '#E74C3C' },
  NO_SHOW: { bg: '#FADBD8', text: '#E74C3C' },
}

const INACTIVE: AppointmentStatus[] = ['CANCELLED', 'NO_SHOW']

export default function VetConsultationListScreen() {
  const router = useRouter()
  const { colors, isDark } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [activeTab, setActiveTab] = useState<ConsultationTab>('TODAY')

  const { data, isLoading, isError } = useVetAppointments({})
  const appointments = data ?? []
  const todayStr = localDateStr()

  const filtered = useMemo(() => {
    if (activeTab === 'TODAY') {
      return appointments
        .filter((a) => localDateStr(new Date(a.apt_scheduled_at)) === todayStr && !INACTIVE.includes(a.apt_status))
        .sort((a, b) => a.apt_scheduled_at.localeCompare(b.apt_scheduled_at))
    }
    if (activeTab === 'UPCOMING') {
      return appointments
        .filter((a) => localDateStr(new Date(a.apt_scheduled_at)) > todayStr && !INACTIVE.includes(a.apt_status))
        .sort((a, b) => a.apt_scheduled_at.localeCompare(b.apt_scheduled_at))
    }
    return appointments
      .filter((a) => a.apt_status === 'COMPLETED')
      .sort((a, b) => b.apt_scheduled_at.localeCompare(a.apt_scheduled_at))
  }, [activeTab, appointments, todayStr])

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={styles.safeArea.backgroundColor} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Consultations</Text>

        <View style={styles.tabRow}>
          {TABS.map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0) + tab.slice(1).toLowerCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : isError ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Unable to load consultations.</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No consultations found.</Text>
          </View>
        ) : (
          filtered.map((item) => {
            const statusStyle = STATUS_COLORS[item.apt_status]
            return (
              <Pressable
                key={item.apt_id}
                onPress={() => router.push(`/(vet)/consultations/${item.apt_id}`)}
                style={styles.card}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardDateTime}>
                    <Text style={styles.cardDate}>
                      {formatShortDate(item.apt_scheduled_at)} | {formatTime(item.apt_scheduled_at)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{item.apt_status}</Text>
                  </View>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.petName}>
                    {item.pet_name}
                    {item.pet_breed || item.pet_species ? (
                      <Text style={styles.petBreed}> | {item.pet_breed ?? item.pet_species}</Text>
                    ) : null}
                  </Text>
                  <Text style={styles.ownerName}>Owner: {item.owner_name ?? '—'}</Text>
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

  title: { ...font.extrabold, color: colors.text, fontSize: 22, marginBottom: 16 },

  tabRow: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 4, marginBottom: 20 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: colors.surface },
  tabText: { ...font.semibold, color: colors.textSecondary, fontSize: 13 },
  tabTextActive: { color: colors.text },

  loading: { marginVertical: 40 },

  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.borderLight },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardDateTime: {},
  cardDate: { ...font.bold, color: colors.text, fontSize: 14 },
  cardInfo: { marginTop: 10 },
  petName: { ...font.bold, color: colors.text, fontSize: 16 },
  petBreed: { ...font.medium, color: colors.textSecondary, fontSize: 14 },
  ownerName: { ...font.regular, color: colors.textSecondary, fontSize: 13, marginTop: 4 },

  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { ...font.bold, fontSize: 11 },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { ...font.regular, color: colors.textSecondary, fontSize: 14 },
})
