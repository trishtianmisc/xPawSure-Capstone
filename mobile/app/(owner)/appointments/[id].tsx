import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams } from 'expo-router'
import { useMemo } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { StatusPill } from '../../../features/appointment/components/StatusPill'
import { useAppointment } from '../../../features/appointment/hooks/useAppointment'
import { useCancelAppointment } from '../../../features/appointment/hooks/useCancelAppointment'
import { ErrorRetry } from '../../../src/components/ErrorRetry'
import { useTheme, type AppColors } from '../../../src/context/ThemeContext'

const CANCELLABLE_STATUSES = ['PENDING', 'CONFIRMED']

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
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { data: appointment, isError, isLoading, refetch, isRefetching } = useAppointment(id)
  const cancelAppointment = useCancelAppointment()

  function handleCancel() {
    if (!id) return

    Alert.alert(
      'Cancel appointment',
      'Are you sure you want to cancel this appointment?',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Cancel appointment',
          style: 'destructive',
          onPress: () => cancelAppointment.mutate({ aptId: id }),
        },
      ],
    )
  }

  if (isLoading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  if (isError || !appointment) {
    return (
      <View style={styles.centerState}>
        <ErrorRetry
          isRetrying={isRefetching}
          message="We couldn't load this appointment."
          onRetry={() => void refetch()}
        />
      </View>
    )
  }

  const canCancel = CANCELLABLE_STATUSES.includes(appointment.apt_status)
  const scheduled = new Date(appointment.apt_scheduled_at).toLocaleString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.statusCard}>
        <StatusPill status={appointment.apt_status} />
        {appointment.apt_status === 'PENDING' && (
          <Text style={styles.pendingNote}>
            The clinic will confirm your appointment shortly. You&apos;ll receive a notification.
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Appointment</Text>
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
            <View
              style={[
                styles.scanBadge,
                appointment.screening.ais_source === 'MOCK' ? styles.scanBadgeDemo : styles.scanBadgeReal,
              ]}
            >
              <Text
                style={[
                  styles.scanBadgeText,
                  appointment.screening.ais_source === 'MOCK' ? styles.scanBadgeTextDemo : styles.scanBadgeTextReal,
                ]}
              >
                {appointment.screening.ais_source === 'MOCK' ? 'Demo' : 'On-device AI'}
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
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  content: { gap: 14, padding: 20 },
  centerState: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 },
  statusText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
  statusCard: { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderRadius: 14, borderWidth: 1, gap: 10, padding: 16 },
  pendingNote: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, gap: 12, padding: 16 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  scanHeader: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  scanBadge: { borderRadius: 999, marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 3 },
  scanBadgeDemo: { backgroundColor: colors.iconBg },
  scanBadgeReal: { backgroundColor: colors.primaryLight },
  scanBadgeText: { fontSize: 11, fontWeight: '700' },
  scanBadgeTextDemo: { color: colors.textSecondary },
  scanBadgeTextReal: { color: colors.primaryDark },
  detailRow: { gap: 2 },
  detailLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  detailValue: { color: colors.text, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  cancelButton: { alignItems: 'center', backgroundColor: colors.errorBg, borderRadius: 12, justifyContent: 'center', minHeight: 48 },
  cancelButtonDisabled: { opacity: 0.6 },
  cancelButtonText: { color: colors.inverse, fontSize: 15, fontWeight: '700' },
})
