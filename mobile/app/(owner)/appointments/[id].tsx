import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { StatusPill } from '../../../features/appointment/components/StatusPill'
import { useAppointment } from '../../../features/appointment/hooks/useAppointment'
import { useCancelAppointment } from '../../../features/appointment/hooks/useCancelAppointment'
import type { AppointmentStatus } from '../../../features/appointment/types'
import { ConfirmDialog } from '../../../src/components/ConfirmDialog'
import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'

const CANCELLABLE_STATUSES = ['PENDING', 'CONFIRMED']

const STATUS_NOTES: Partial<Record<AppointmentStatus, string>> = {
  PENDING:
    'The clinic will confirm your appointment shortly. You’ll receive a notification.',
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  )
}

export default function AppointmentDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { data: appointment, isError, isLoading } = useAppointment(id)
  const cancelAppointment = useCancelAppointment()
  const [confirmVisible, setConfirmVisible] = useState(false)

  function handleBack() {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(owner)/appointments')
    }
  }

  function handleCancel() {
    if (!id) return
    setConfirmVisible(true)
  }

  function handleConfirmCancel() {
    if (!id) return
    cancelAppointment.mutate(
      { aptId: id },
      {
        onSettled: () => setConfirmVisible(false),
      },
    )
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        hitSlop={8}
        onPress={handleBack}
        style={styles.headerBack}
      >
        <MaterialCommunityIcons color={colors.text} name="arrow-left" size={22} />
      </Pressable>
      <Text style={styles.headerTitle}>Appointment Details</Text>
      <View style={styles.headerRight} />
    </View>
  )

  if (isLoading) {
    return (
      <View style={styles.screen}>
        {renderHeader()}
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    )
  }

  if (isError || !appointment) {
    return (
      <View style={styles.screen}>
        {renderHeader()}
        <View style={styles.centerState}>
          <Text style={styles.statusText}>Appointment not found.</Text>
        </View>
      </View>
    )
  }

  const canCancel = CANCELLABLE_STATUSES.includes(appointment.apt_status)
  const statusNote = STATUS_NOTES[appointment.apt_status]
  const scheduled = new Date(appointment.apt_scheduled_at).toLocaleString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <View style={styles.screen}>
      {renderHeader()}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {statusNote && (
          <View style={styles.noteCard}>
            <Text style={styles.pendingNote}>{statusNote}</Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Appointment</Text>
            <StatusPill status={appointment.apt_status} />
          </View>
          <DetailRow label="Date & time" value={scheduled} />
          <DetailRow label="Type" value={appointment.apt_type.replace('_', ' ')} />
          <DetailRow label="Veterinarian" value={appointment.vet_name ?? 'To be assigned'} />
          <DetailRow label="Clinic" value={appointment.clinic_name} />
          {appointment.apt_reason ? <DetailRow label="Reason" value={appointment.apt_reason} /> : null}
          {appointment.apt_cancellation_reason ? (
            <DetailRow label="Cancellation reason" value={appointment.apt_cancellation_reason} />
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pet</Text>
          <DetailRow label="Name" value={appointment.pet_name} />
          <DetailRow label="Breed" value={appointment.pet_breed ?? 'Not specified'} />
          <DetailRow label="Sex" value={appointment.pet_sex} />
        </View>

        {appointment.screening && (
          <View style={styles.card}>
            <View style={styles.scanHeader}>
              <Ionicons color={colors.primary} name="sparkles-outline" size={18} />
              <Text style={styles.cardTitle}>Skin scan result</Text>
              <View style={[styles.scanBadge, styles.scanBadgeReal]}>
                <Text style={[styles.scanBadgeText, styles.scanBadgeTextReal]}>
                  On-device AI
                </Text>
              </View>
            </View>
            <DetailRow label="Prediction" value={appointment.screening.disease} />
            <DetailRow
              label="Confidence"
              value={`${Math.round(Number(appointment.screening.ais_confidence))}%`}
            />
            <DetailRow label="Model" value={appointment.screening.ais_model_version} />
          </View>
        )}

        {canCancel && (
          <Pressable
            accessibilityRole="button"
            disabled={cancelAppointment.isPending}
            onPress={handleCancel}
            style={[styles.cancelButton, cancelAppointment.isPending && styles.cancelButtonDisabled]}
          >
            <Text style={styles.cancelButtonText}>
              {cancelAppointment.isPending ? 'Cancelling...' : 'Cancel appointment'}
            </Text>
          </Pressable>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={confirmVisible}
        title="Cancel appointment?"
        message="Are you sure you want to cancel this appointment?"
        icon="calendar-remove-outline"
        confirmLabel="Cancel"
        cancelLabel="Keep it"
        busy={cancelAppointment.isPending}
        onConfirm={handleConfirmCancel}
        onCancel={() => setConfirmVisible(false)}
      />
    </View>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: { backgroundColor: colors.surface, flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', height: 48, marginBottom: 4, marginHorizontal: 10, marginTop: 4 },
  headerBack: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  headerTitle: { ...font.extrabold, color: colors.text, fontSize: 20, marginLeft: 2 },
  headerRight: { width: 48 },
  content: { gap: 14, padding: 20 },
  centerState: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 },
  statusText: { ...font.regular, color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
  noteCard: { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderRadius: 14, borderWidth: 1, padding: 16 },
  pendingNote: { ...font.regular, color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, gap: 12, padding: 16 },
  cardTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  cardTitle: { ...font.extrabold, color: colors.text, fontSize: 16 },
  scanHeader: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  scanBadge: { borderRadius: 999, marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 3 },
  scanBadgeReal: { backgroundColor: colors.primaryLight },
  scanBadgeText: { ...font.bold, fontSize: 11 },
  scanBadgeTextReal: { color: colors.primaryDark },
  detailRow: { gap: 2 },
  detailLabel: { ...font.semibold, color: colors.textMuted, fontSize: 12, textTransform: 'uppercase' },
  detailValue: { ...font.semibold, color: colors.text, fontSize: 14, lineHeight: 20 },
  cancelButton: { alignItems: 'center', backgroundColor: colors.error, borderRadius: 12, justifyContent: 'center', minHeight: 48 },
  cancelButtonDisabled: { opacity: 0.6 },
  cancelButtonText: { ...font.bold, color: colors.inverse, fontSize: 15 },
})
