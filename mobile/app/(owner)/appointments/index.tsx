import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { StatusPill } from '../../../features/appointment/components/StatusPill'
import { useMyAppointments } from '../../../features/appointment/hooks/useMyAppointments'
import type { AppointmentListItem } from '../../../features/appointment/types'
import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS']
type Tab = 'upcoming' | 'history'

function AppointmentRow({
  appointment,
  onPress,
}: {
  appointment: AppointmentListItem
  onPress: () => void
}) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  const scheduled = new Date(appointment.apt_scheduled_at)
  const weekday = scheduled.toLocaleDateString(undefined, { weekday: 'short' })
  const day = scheduled.getDate()
  const month = scheduled.toLocaleDateString(undefined, { month: 'short' })
  const time = scheduled.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <Pressable
      accessibilityHint="Opens the appointment details"
      accessibilityLabel={`Appointment for ${appointment.pet_name} on ${weekday} ${day} ${month} at ${time}`}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.dateBlock}>
        <Text style={styles.dateWeekday}>{weekday}</Text>
        <Text style={styles.dateDay}>{day}</Text>
        <Text style={styles.dateMonth}>{month}</Text>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text numberOfLines={1} style={styles.petName}>{appointment.pet_name}</Text>
          <StatusPill status={appointment.apt_status} />
        </View>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons color={colors.primary} name="stethoscope" size={14} />
          <Text numberOfLines={1} style={styles.metaText}>
            {appointment.vet_name ?? 'Vet to be assigned'}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons color={colors.primary} name="clock-outline" size={14} />
          <Text style={styles.metaText}>{time}</Text>
        </View>
      </View>

      <MaterialCommunityIcons color={colors.textMuted} name="chevron-right" size={18} />
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
          <View style={styles.titleActions}>
            <Pressable
              accessibilityLabel="Payment receipts"
              accessibilityRole="button"
              onPress={() => router.push('/(owner)/payments')}
              style={styles.receiptButton}
            >
              <MaterialCommunityIcons color={colors.primary} name="receipt" size={18} />
            </Pressable>
          </View>
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
                  ? 'No upcoming appointments yet. Run a skin screening to book one.'
                  : 'No past appointments yet.'}
              </Text>
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
  titleActions: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  receiptButton: { alignItems: 'center', borderColor: colors.border, borderRadius: 10, borderWidth: 1, height: 35, justifyContent: 'center', width: 38 },
  title: { ...font.extrabold, color: colors.text, fontSize: 22 },
  tabs: { backgroundColor: colors.surfaceAlt, borderRadius: 12, flexDirection: 'row', gap: 4, marginTop: 20, padding: 4 },
  tab: { alignItems: 'center', borderRadius: 9, flex: 1, minHeight: 36, justifyContent: 'center' },
  tabActive: { backgroundColor: colors.surface },
  tabText: { ...font.semibold, color: colors.textSecondary, fontSize: 13 },
  tabTextActive: { color: colors.text },
  list: { gap: 12, paddingBottom: 24, paddingTop: 20 },
  card: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  dateBlock: { alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: 12, gap: 1, paddingVertical: 10, width: 58 },
  dateWeekday: { ...font.bold, color: colors.textMuted, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },
  dateDay: { ...font.extrabold, color: colors.text, fontSize: 22, lineHeight: 26 },
  dateMonth: { ...font.semibold, color: colors.textSecondary, fontSize: 11 },
  cardBody: { flex: 1, gap: 4 },
  cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  petName: { ...font.bold, color: colors.text, flex: 1, fontSize: 15, marginRight: 8 },
  metaRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  metaText: { ...font.semibold, color: colors.textSecondary, fontSize: 12, flexShrink: 1 },
  statusState: { alignItems: 'center', justifyContent: 'center', minHeight: 160 },
  emptyState: { alignItems: 'center', borderColor: colors.border, borderRadius: 14, borderStyle: 'dashed', borderWidth: 1, gap: 10, justifyContent: 'center', minHeight: 140, paddingHorizontal: 24 },
  statusText: { ...font.regular, color: colors.textSecondary, fontSize: 13, lineHeight: 20, textAlign: 'center' },
})
