import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { StatusPill } from '../../../features/appointment/components/StatusPill'
import { useMyAppointments } from '../../../features/appointment/hooks/useMyAppointments'
import type { AppointmentListItem } from '../../../features/appointment/types'
import { useTheme, type AppColors } from '../../../src/context/ThemeContext'

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS']
type Tab = 'upcoming' | 'history'

function formatDateTime(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function AppointmentRow({
  appointment,
  onPress,
}: {
  appointment: AppointmentListItem
  onPress: () => void
}) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text numberOfLines={1} style={styles.petName}>{appointment.pet_name}</Text>
        <StatusPill status={appointment.apt_status} />
      </View>
      <Text numberOfLines={1} style={styles.meta}>
        {appointment.vet_name ?? 'Vet to be assigned'} · {appointment.apt_type.replace('_', ' ')}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.dateTime}>{formatDateTime(appointment.apt_scheduled_at)}</Text>
        <Ionicons color={colors.textMuted} name="chevron-forward" size={16} />
      </View>
    </Pressable>
  )
}

export default function AppointmentsScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [tab, setTab] = useState<Tab>('upcoming')
  const { data, isError, isLoading } = useMyAppointments()

  const { upcoming, history } = useMemo(() => {
    const results = data?.results ?? []
    const now = Date.now()
    const upcomingItems: AppointmentListItem[] = []
    const historyItems: AppointmentListItem[] = []

    for (const appointment of results) {
      const isActive = ACTIVE_STATUSES.includes(appointment.apt_status)
      const isFuture = new Date(appointment.apt_scheduled_at).getTime() >= now
      if (isActive && isFuture) {
        upcomingItems.push(appointment)
      } else {
        historyItems.push(appointment)
      }
    }

    return { upcoming: upcomingItems, history: historyItems }
  }, [data])

  const visibleAppointments = tab === 'upcoming' ? upcoming : history

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Appointments</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(owner)/appointments/book')}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>+ Book</Text>
          </Pressable>
        </View>

        <View style={styles.tabs}>
          {(['upcoming', 'history'] as Tab[]).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="tab"
              onPress={() => setTab(value)}
              style={[styles.tab, tab === value && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === value && styles.tabTextActive]}>
                {value === 'upcoming' ? 'Upcoming' : 'History'}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.statusState}><ActivityIndicator color={colors.primary} /></View>
          ) : isError ? (
            <Text style={styles.statusText}>We couldn&apos;t load your appointments. Please try again.</Text>
          ) : visibleAppointments.length > 0 ? (
            visibleAppointments.map((appointment) => (
              <AppointmentRow
                key={appointment.apt_id}
                appointment={appointment}
                onPress={() => router.push(`/(owner)/appointments/${appointment.apt_id}`)}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons color={colors.textMuted} name="calendar-blank-outline" size={26} />
              <Text style={styles.statusText}>
                {tab === 'upcoming'
                  ? 'No upcoming appointments. Book one to get started.'
                  : 'No past appointments yet.'}
              </Text>
              {tab === 'upcoming' && !isLoading && !isError && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/(owner)/appointments/book')}
                  style={styles.emptyButton}
                >
                  <Text style={styles.emptyButtonText}>Book an appointment</Text>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: { backgroundColor: colors.surface, flex: 1 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  titleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  addButton: { backgroundColor: colors.primary, borderRadius: 10, minHeight: 36, paddingHorizontal: 16, justifyContent: 'center' },
  addButtonText: { color: colors.inverse, fontSize: 14, fontWeight: '700' },
  tabs: { backgroundColor: colors.surfaceAlt, borderRadius: 12, flexDirection: 'row', gap: 4, marginTop: 20, padding: 4 },
  tab: { alignItems: 'center', borderRadius: 9, flex: 1, minHeight: 36, justifyContent: 'center' },
  tabActive: { backgroundColor: colors.surface },
  tabText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: colors.text },
  list: { gap: 12, paddingBottom: 24, paddingTop: 20 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, gap: 6, paddingHorizontal: 16, paddingVertical: 14 },
  cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  petName: { color: colors.text, flex: 1, fontSize: 16, fontWeight: '700', marginRight: 10 },
  meta: { color: colors.textSecondary, fontSize: 13 },
  cardFooter: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  dateTime: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  statusState: { alignItems: 'center', justifyContent: 'center', minHeight: 160 },
  emptyState: { alignItems: 'center', borderColor: colors.border, borderRadius: 14, borderStyle: 'dashed', borderWidth: 1, gap: 12, justifyContent: 'center', minHeight: 160, paddingHorizontal: 24 },
  statusText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  emptyButton: { backgroundColor: colors.primary, borderRadius: 10, minHeight: 40, paddingHorizontal: 18, justifyContent: 'center' },
  emptyButtonText: { color: colors.inverse, fontSize: 14, fontWeight: '700' },
})
