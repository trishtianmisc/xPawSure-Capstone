import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState, type ComponentProps } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { useAppointment } from '../../../features/appointment/hooks/useAppointment'
import { useCancelAppointment } from '../../../features/appointment/hooks/useCancelAppointment'
import { STATUS_PRESENTATION } from '../../../features/appointment/lib/statusPresentation'
import type { AppointmentStatus } from '../../../features/appointment/types'
import { formatMoney } from '../../../features/payment/lib/format'
import { pickAppointmentPayment } from '../../../features/payment/lib/pickAppointmentPayment'
import { useAppointmentPayment } from '../../../features/payment/hooks/useAppointmentPayment'
import type { PaymentStatus } from '../../../features/payment/types'
import { ConfirmDialog } from '../../../src/components/ConfirmDialog'
import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

const CANCELLABLE_STATUSES: AppointmentStatus[] = ['PENDING', 'CONFIRMED']

/** Receipt presentation for the payment card; mirrors the status palette. */
const PAYMENT_PRESENTATION: Record<
  PaymentStatus,
  { label: string; bg: string; text: string }
> = {
  PENDING: { label: 'Pending', bg: '#FDEBD0', text: '#E67E22' },
  PAID: { label: 'Paid', bg: '#D5F5E3', text: '#1E8449' },
  FAILED: { label: 'Failed', bg: '#FADBD8', text: '#C0392B' },
  EXPIRED: { label: 'Expired', bg: '#E5E7E9', text: '#566573' },
  REFUNDED: { label: 'Refunded', bg: '#D6EAF8', text: '#2471A3' },
  VOID: { label: 'Void', bg: '#E5E7E9', text: '#566573' },
}

/** 'CONSULTATION' → 'Consultation', 'MALE' → 'Male'. */
function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function InfoRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <MaterialCommunityIcons color={colors.primary} name={icon} size={15} />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.infoValue}>{value}</Text>
    </View>
  )
}

export default function AppointmentDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { data: appointment, isError, isLoading } = useAppointment(id)
  const { data: paymentsData } = useAppointmentPayment(appointment?.apt_id)
  const cancelAppointment = useCancelAppointment()
  const [confirmVisible, setConfirmVisible] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  function handleBack() {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(owner)/appointments')
    }
  }

  function handleCancel() {
    setCancelReason('')
    setConfirmVisible(true)
  }

  function handleConfirmCancel() {
    if (!id) return
    cancelAppointment.mutate(
      { aptId: id, reason: cancelReason.trim() || undefined },
      {
        onSettled: () => {
          setConfirmVisible(false)
          setCancelReason('')
        },
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

  const presentation = STATUS_PRESENTATION[appointment.apt_status]
  const canCancel = CANCELLABLE_STATUSES.includes(appointment.apt_status)
  const payment = paymentsData ? pickAppointmentPayment(paymentsData.results) : null
  const paymentPresentation = payment ? PAYMENT_PRESENTATION[payment.status] : null

  const scheduledDate = new Date(appointment.apt_scheduled_at)
  const weekday = scheduledDate.toLocaleDateString(undefined, { weekday: 'short' })
  const dayNumber = scheduledDate.getDate()
  const monthYear = scheduledDate.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
  const timeText = scheduledDate.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  const bookedOn = new Date(appointment.apt_created_at).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const paidOn = payment?.paid_at
    ? new Date(payment.paid_at).toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null

  return (
    <View style={styles.screen}>
      {renderHeader()}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status banner */}
        <View style={[styles.banner, { backgroundColor: presentation.bg }]}>
          <View style={[styles.bannerIcon, { borderColor: presentation.text }]}>
            <MaterialCommunityIcons
              color={presentation.text}
              name={presentation.icon as IconName}
              size={24}
            />
          </View>
          <View style={styles.bannerBody}>
            <Text style={[styles.bannerTitle, { color: presentation.text }]}>
              {presentation.label}
            </Text>
            <Text style={styles.bannerNote}>{presentation.note}</Text>
            {appointment.apt_status === 'CANCELLED' && appointment.apt_cancellation_reason ? (
              <Text style={styles.bannerReason}>
                Reason: {appointment.apt_cancellation_reason}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Schedule */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>SCHEDULE</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateBlock}>
              <Text style={styles.dateWeekday}>{weekday}</Text>
              <Text style={styles.dateDay}>{dayNumber}</Text>
              <Text style={styles.dateMonth}>{monthYear}</Text>
            </View>
            <View style={styles.timeBlock}>
              <MaterialCommunityIcons color={colors.primary} name="clock-outline" size={20} />
              <Text style={styles.timeText}>{timeText}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <InfoRow
            icon="hospital-building"
            label="Clinic"
            value={appointment.clinic_name}
          />
          <InfoRow
            icon="stethoscope"
            label="Veterinarian"
            value={appointment.vet_name ?? 'To be assigned'}
          />
          <InfoRow
            icon="clipboard-text-outline"
            label="Type"
            value={titleCase(appointment.apt_type)}
          />
        </View>

        {/* Patient */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>PATIENT</Text>
          <View style={styles.patientRow}>
            <View style={styles.patientIcon}>
              <MaterialCommunityIcons color={colors.primary} name="paw" size={22} />
            </View>
            <View style={styles.patientBody}>
              <Text style={styles.patientName}>{appointment.pet_name}</Text>
              <Text style={styles.patientMeta}>
                {appointment.pet_breed ?? 'Breed not specified'} · {titleCase(appointment.pet_sex)}
              </Text>
            </View>
            <Pressable
              accessibilityHint="Opens this pet's medical profile"
              accessibilityLabel={`View profile of ${appointment.pet_name}`}
              accessibilityRole="button"
              hitSlop={6}
              onPress={() => router.push(`/(owner)/pets/${appointment.pet_id}`)}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>View profile</Text>
              <MaterialCommunityIcons color={colors.primary} name="chevron-right" size={16} />
            </Pressable>
          </View>
        </View>

        {/* Reason */}
        {appointment.apt_reason ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>REASON FOR VISIT</Text>
            <Text style={styles.reasonText}>{appointment.apt_reason}</Text>
          </View>
        ) : null}

        {/* Skin scan */}
        {appointment.screening ? (
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>SKIN SCAN RESULT</Text>
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>On-device AI</Text>
              </View>
            </View>
            <InfoRow
              icon="bug-outline"
              label="Prediction"
              value={appointment.screening.disease}
            />
            <InfoRow
              icon="chart-donut"
              label="Confidence"
              value={`${Math.round(Number(appointment.screening.ais_confidence))}%`}
            />
            <InfoRow
              icon="chip"
              label="Model"
              value={appointment.screening.ais_model_version}
            />
            <Text style={styles.disclaimer}>
              AI assists the veterinarian and is not a diagnosis.
            </Text>
            <Pressable
              accessibilityHint="Opens the full screening log"
              accessibilityLabel="View screening details"
              accessibilityRole="button"
              hitSlop={6}
              onPress={() =>
                router.push({
                  pathname: '/(owner)/screenings/[id]',
                  params: { id: appointment.screening!.ais_id },
                })
              }
              style={styles.linkRow}
            >
              <Text style={styles.linkText}>View screening details</Text>
              <MaterialCommunityIcons color={colors.primary} name="chevron-right" size={16} />
            </Pressable>
          </View>
        ) : null}

        {/* Payment */}
        {payment && paymentPresentation ? (
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>PAYMENT</Text>
              <View style={[styles.payPill, { backgroundColor: paymentPresentation.bg }]}>
                <Text style={[styles.payPillText, { color: paymentPresentation.text }]}>
                  {paymentPresentation.label}
                </Text>
              </View>
            </View>
            <Text style={styles.payAmount}>
              {formatMoney(payment.amount, payment.currency)}
            </Text>
            <InfoRow icon="credit-card-outline" label="Method" value={payment.method} />
            <InfoRow icon="receipt" label="Reference" value={payment.reference_no} />
            {paidOn ? <InfoRow icon="calendar-check" label="Paid on" value={paidOn} /> : null}
          </View>
        ) : null}

        {/* Document footer */}
        <Text style={styles.footerMeta}>
          Booked on {bookedOn} · Ref {appointment.apt_id.slice(0, 8).toUpperCase()}
        </Text>

        {canCancel ? (
          <Pressable
            accessibilityRole="button"
            disabled={cancelAppointment.isPending}
            onPress={handleCancel}
            style={[styles.cancelButton, cancelAppointment.isPending && styles.cancelButtonDisabled]}
          >
            <MaterialCommunityIcons color={colors.error} name="calendar-remove-outline" size={18} />
            <Text style={styles.cancelButtonText}>
              {cancelAppointment.isPending ? 'Cancelling…' : 'Cancel appointment'}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <ConfirmDialog
        visible={confirmVisible}
        title="Cancel appointment?"
        message="This releases your slot at the clinic. This action cannot be undone."
        icon="calendar-remove-outline"
        confirmLabel="Cancel appointment"
        cancelLabel="Keep appointment"
        busy={cancelAppointment.isPending}
        reasonInput={{
          label: 'Reason (optional)',
          value: cancelReason,
          placeholder: 'e.g. Schedule conflict',
          onChange: setCancelReason,
        }}
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
  content: { gap: 14, padding: 20, paddingBottom: 32 },
  centerState: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 },
  statusText: { ...font.regular, color: colors.textSecondary, fontSize: 14, textAlign: 'center' },

  banner: { alignItems: 'flex-start', borderRadius: 14, flexDirection: 'row', gap: 12, padding: 16 },
  bannerIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1.5,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  bannerBody: { flex: 1, gap: 4 },
  bannerTitle: { ...font.extrabold, fontSize: 15 },
  bannerNote: { ...font.regular, color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  bannerReason: { ...font.semibold, color: colors.text, fontSize: 13, lineHeight: 18 },

  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, gap: 12, padding: 16 },
  sectionLabel: { ...font.bold, color: colors.textMuted, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  sectionHeaderRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  divider: { backgroundColor: colors.border, height: 1 },

  dateRow: { alignItems: 'stretch', flexDirection: 'row', gap: 12 },
  dateBlock: { alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: 14, gap: 2, minWidth: 132, paddingHorizontal: 16, paddingVertical: 12 },
  dateWeekday: { ...font.bold, color: colors.textMuted, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  dateDay: { ...font.extrabold, color: colors.text, fontSize: 34, lineHeight: 38 },
  dateMonth: { ...font.semibold, color: colors.textSecondary, fontSize: 12 },
  timeBlock: { alignItems: 'center', borderColor: colors.border, borderRadius: 14, borderWidth: 1, flex: 1, gap: 6, justifyContent: 'center' },
  timeText: { ...font.bold, color: colors.text, fontSize: 15 },

  infoRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  infoIcon: { alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: 8, height: 26, justifyContent: 'center', width: 26 },
  infoLabel: { ...font.semibold, color: colors.textSecondary, fontSize: 13, width: 88 },
  infoValue: { ...font.semibold, color: colors.text, flex: 1, fontSize: 13, textAlign: 'right' },

  patientRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  patientIcon: { alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: 12, height: 44, justifyContent: 'center', width: 44 },
  patientBody: { flex: 1 },
  patientName: { ...font.bold, color: colors.text, fontSize: 15 },
  patientMeta: { ...font.regular, color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  linkButton: { alignItems: 'center', flexDirection: 'row', gap: 2 },
  linkRow: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: 2, justifyContent: 'space-between', marginTop: 2, paddingTop: 10 },
  linkText: { ...font.bold, color: colors.primary, fontSize: 13 },

  reasonText: { ...font.regular, color: colors.text, fontSize: 14, lineHeight: 21 },

  aiBadge: { backgroundColor: colors.primaryLight, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  aiBadgeText: { ...font.bold, color: colors.primaryDark, fontSize: 11 },
  disclaimer: { ...font.regular, color: colors.textMuted, fontSize: 12, lineHeight: 17 },

  payPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  payPillText: { ...font.bold, fontSize: 11 },
  payAmount: { ...font.extrabold, color: colors.text, fontSize: 26 },

  footerMeta: { ...font.regular, color: colors.textMuted, fontSize: 12, textAlign: 'center' },

  cancelButton: { alignItems: 'center', borderColor: colors.error, borderRadius: 12, borderWidth: 1.5, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 48 },
  cancelButtonDisabled: { opacity: 0.6 },
  cancelButtonText: { ...font.bold, color: colors.error, fontSize: 15 },
})
