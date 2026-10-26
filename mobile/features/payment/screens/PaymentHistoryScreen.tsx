import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'
import { apiErrorMessage } from '../../../src/utils/error'
import { useMyPayments } from '../hooks/useMyPayments'
import { formatDateTime, formatMoney } from '../lib/format'
import type { Payment, PaymentStatus } from '../types'

type Filter = 'ALL' | PaymentStatus

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PAID', label: 'Paid' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'EXPIRED', label: 'Expired' },
]

function statusColors(status: PaymentStatus, colors: AppColors) {
  switch (status) {
    case 'PAID':
      return { backgroundColor: colors.primaryLight, color: colors.primaryDark }
    case 'PENDING':
      return { backgroundColor: colors.iconBg, color: colors.iconColor }
    case 'FAILED':
    case 'VOID':
      return { backgroundColor: colors.errorBg, color: colors.error }
    default:
      return { backgroundColor: colors.surfaceAlt, color: colors.textSecondary }
  }
}

function PaymentCard({ payment }: { payment: Payment }) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const badge = statusColors(payment.status, colors)

  async function resumeCheckout() {
    if (!payment.checkout_url) return
    try {
      await Linking.openURL(payment.checkout_url)
    } catch {
      // The receipt stays readable even when no browser can take the link.
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.amount}>{formatMoney(payment.amount, payment.currency)}</Text>
        <View style={[styles.badge, { backgroundColor: badge.backgroundColor }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>{payment.status}</Text>
        </View>
      </View>

      <Text style={styles.meta}>
        {payment.pet_name ?? 'Consultation'} · {payment.method.replace('_', ' ')}
      </Text>
      <Text style={styles.reference}>Ref {payment.reference_no}</Text>
      <Text style={styles.date}>{formatDateTime(payment.created_at)}</Text>

      {payment.status === 'PENDING' && payment.checkout_url ? (
        <Pressable
          accessibilityRole="button"
          onPress={resumeCheckout}
          style={styles.resumeButton}
        >
          <MaterialCommunityIcons color={colors.inverse} name="open-in-new" size={16} />
          <Text style={styles.resumeText}>Resume payment</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

export default function PaymentHistoryScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [filter, setFilter] = useState<Filter>('ALL')
  const { data, isLoading, isError, error, refetch, isRefetching } = useMyPayments(filter)

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(owner)/appointments')
    }
  }

  const payments = data?.results ?? []

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={handleBack} style={styles.headerBack}>
          <MaterialCommunityIcons color={colors.text} name="arrow-left" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Payments</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.filters}>
          {FILTERS.map((option) => (
            <Pressable
              key={option.value}
              accessibilityRole="tab"
              onPress={() => setFilter(option.value)}
              style={[styles.filterChip, filter === option.value && styles.filterChipActive]}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === option.value && styles.filterTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {isLoading ? (
          <View style={styles.statusState}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : isError ? (
          <Pressable accessibilityRole="button" onPress={() => refetch()} style={styles.statusState}>
            <Text style={styles.statusText}>{apiErrorMessage(error)}</Text>
            <Text style={styles.retryText}>Tap to try again</Text>
          </Pressable>
        ) : payments.length > 0 ? (
          <View style={styles.list}>
            {payments.map((payment) => (
              <PaymentCard key={payment.pay_id} payment={payment} />
            ))}
            {isRefetching ? <ActivityIndicator color={colors.primary} /> : null}
          </View>
        ) : (
          <View style={styles.statusState}>
            <MaterialCommunityIcons color={colors.textMuted} name="receipt" size={34} />
            <Text style={styles.statusText}>
              {filter === 'ALL'
                ? 'No payments yet. Payments appear here after you pay a consultation fee.'
                : `No ${filter.toLowerCase()} payments.`}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    screen: { backgroundColor: colors.surface, flex: 1 },
    header: { height: 50, marginHorizontal: 10, marginBottom: 8, marginTop: 4 },
    headerBack: {
      alignItems: 'center',
      height: 50,
      justifyContent: 'center',
      marginTop: 5,
      width: 50,
    },
    headerTitle: {
      ...font.extrabold,
      color: colors.text,
      fontSize: 20,
      marginLeft: 50,
      marginTop: -40,
    },
    headerRight: { width: 20 },
    content: { gap: 14, paddingHorizontal: 20, paddingBottom: 24 },
    filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    filterChip: {
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      minHeight: 36,
      paddingHorizontal: 14,
      justifyContent: 'center',
    },
    filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { ...font.semibold, color: colors.textSecondary, fontSize: 13 },
    filterTextActive: { color: colors.inverse },
    list: { gap: 12 },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      gap: 6,
      padding: 16,
    },
    cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    amount: { ...font.extrabold, color: colors.text, fontSize: 20 },
    badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    badgeText: { ...font.bold, fontSize: 11 },
    meta: { ...font.semibold, color: colors.textSecondary, fontSize: 14 },
    reference: { ...font.regular, color: colors.textMuted, fontSize: 13 },
    date: { ...font.regular, color: colors.textMuted, fontSize: 13 },
    resumeButton: {
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: 12,
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
      marginTop: 6,
      minHeight: 44,
    },
    resumeText: { ...font.bold, color: colors.inverse, fontSize: 14 },
    statusState: {
      alignItems: 'center',
      borderColor: colors.border,
      borderRadius: 14,
      borderStyle: 'dashed',
      borderWidth: 1,
      gap: 10,
      justifyContent: 'center',
      minHeight: 160,
      paddingHorizontal: 24,
      paddingVertical: 24,
    },
    statusText: {
      ...font.regular,
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
    retryText: { ...font.bold, color: colors.link, fontSize: 13 },
  })
