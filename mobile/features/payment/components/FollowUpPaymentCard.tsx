import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useMemo } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'
import { useFollowUpPayment } from '../hooks/useFollowUpPayment'
import { formatMoney } from '../lib/format'
import { OWNER_METHODS } from '../lib/methods'
import { PAYMENT_PRESENTATION } from '../lib/presentation'
import type { Payment } from '../types'

interface FollowUpPaymentCardProps {
  appointmentId: string
  fee: number
  scheduledAt: string
  /** The latest payment returned for this appointment, if any. */
  payment: Payment | null
}

/**
 * The owner's payment action for a reserved follow-up.
 *
 * The appointment is already in CONFIRMATION, so there is no booking step:
 * paying this checkout is what moves it to CONFIRMED on the backend.
 */
export function FollowUpPaymentCard({
  appointmentId,
  fee,
  scheduledAt,
  payment,
}: FollowUpPaymentCardProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const {
    active,
    amount,
    currency,
    method,
    selectMethod,
    pay,
    cancel,
    message,
    refetch,
    isPaying,
    isCancelling,
    isPending,
    isPaid,
    canChooseMethod,
  } = useFollowUpPayment({ appointmentId, fee, payment })

  const status = active
    ? PAYMENT_PRESENTATION[active.status]
    : { label: 'Due', bg: '#FDEBD0', text: '#E67E22' }
  const deadline = new Date(scheduledAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  const retryCopy =
    active?.status === 'FAILED'
      ? 'The payment did not go through. Try again or pick another method.'
      : active?.status === 'REFUNDED'
        ? 'Your previous payment was refunded. Pay again to keep this follow-up.'
        : active?.status === 'EXPIRED' || active?.status === 'VOID'
          ? 'Your previous checkout is no longer active. Start a new payment to keep this slot.'
          : 'Your follow-up slot is reserved. Pay the consultation fee to confirm it.'
  const payLabel =
    active && !isPending && !isPaid
      ? `Pay again (${formatMoney(amount, currency)})`
      : `Pay ${formatMoney(amount, currency)}`

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>FOLLOW-UP PAYMENT</Text>
          <Text style={styles.title}>
            {isPaid ? 'Payment received' : 'Complete your payment'}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: status.bg }]}>
          <Text style={[styles.pillText, { color: status.text }]}>
            {status.label}
          </Text>
        </View>
      </View>

      <Text style={styles.amount}>{formatMoney(amount, currency)}</Text>
      <Text style={styles.meta}>Consultation fee · due before {deadline}</Text>

      {isPaid ? (
        <View style={styles.stateBlock}>
          <MaterialCommunityIcons
            color={colors.primary}
            name="check-decagram"
            size={30}
          />
          <Text style={styles.stateTitle}>Payment received</Text>
          <Text style={styles.stateText}>
            Confirming your follow-up appointment…
          </Text>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isPending ? (
        <View style={styles.stateBlock}>
          <Text style={styles.stateText}>
            We opened the checkout page. Finish paying there — this card updates on
            its own.
          </Text>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Method</Text>
            <Text style={styles.receiptValue}>{active?.method}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Reference</Text>
            <Text style={styles.receiptValue}>{active?.reference_no}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={pay}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Open checkout page</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => void refetch()}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>
              I&apos;ve paid — check status
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isCancelling}
            onPress={cancel}
            style={[styles.secondaryButton, isCancelling && styles.disabled]}
          >
            <Text style={styles.secondaryButtonText}>
              {isCancelling ? 'Cancelling…' : 'Cancel this payment attempt'}
            </Text>
          </Pressable>
        </View>
      ) : canChooseMethod ? (
        <View style={styles.stateBlock}>
          <Text style={styles.stateText}>{retryCopy}</Text>

          <View style={styles.methodBlock}>
            <Text style={styles.fieldLabel}>Payment method</Text>
            <View style={styles.methodRow}>
              {OWNER_METHODS.map((ownerMethod) => {
                const selected = method === ownerMethod.value
                return (
                  <Pressable
                    key={ownerMethod.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => selectMethod(ownerMethod.value)}
                    style={[
                      styles.methodChip,
                      selected && styles.methodChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.methodText,
                        selected && styles.methodTextSelected,
                      ]}
                    >
                      {ownerMethod.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={isPaying}
            onPress={pay}
            style={[styles.primaryButton, isPaying && styles.disabled]}
          >
            {isPaying ? (
              <ActivityIndicator color={colors.inverse} />
            ) : (
              <Text style={styles.primaryButtonText}>{payLabel}</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {message ? <Text style={styles.errorText}>{message}</Text> : null}

      {!isPaid ? (
        <Text style={styles.note}>
          Unpaid follow-ups are cancelled automatically when the appointment time
          arrives.
        </Text>
      ) : null}
    </View>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  headerCopy: { flex: 1, gap: 3 },
  eyebrow: {
    ...font.bold,
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: { ...font.extrabold, color: colors.text, fontSize: 16 },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { ...font.bold, fontSize: 11 },
  amount: { ...font.extrabold, color: colors.text, fontSize: 26 },
  meta: { ...font.regular, color: colors.textSecondary, fontSize: 12.5, marginTop: -6 },

  stateBlock: { gap: 12 },
  stateTitle: { ...font.semibold, color: colors.text, fontSize: 15, textAlign: 'center' },
  stateText: {
    ...font.regular,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },

  receiptRow: { flexDirection: 'row', justifyContent: 'space-between' },
  receiptLabel: { ...font.semibold, color: colors.textSecondary, fontSize: 12.5 },
  receiptValue: { ...font.semibold, color: colors.text, fontSize: 12.5 },

  methodBlock: { gap: 8 },
  fieldLabel: { ...font.medium, color: colors.text, fontSize: 13 },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methodChip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 18,
  },
  methodChipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  methodText: { ...font.medium, color: colors.textSecondary, fontSize: 13 },
  methodTextSelected: { ...font.semibold, color: colors.primaryDark },

  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 20,
  },
  primaryButtonText: { ...font.semibold, color: colors.inverse, fontSize: 14.5 },
  secondaryButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 20,
  },
  secondaryButtonText: { ...font.medium, color: colors.textSecondary, fontSize: 13.5 },
  disabled: { opacity: 0.5 },

  errorText: { ...font.medium, color: colors.error, fontSize: 12.5, lineHeight: 18 },
  note: { ...font.regular, color: colors.textMuted, fontSize: 11.5, lineHeight: 16 },
})
