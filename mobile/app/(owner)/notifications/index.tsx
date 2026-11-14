import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useMemo, useState, type ComponentProps } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { useApproveReschedule } from '../../../features/appointment/hooks/useApproveReschedule'
import { useCancelAppointment } from '../../../features/appointment/hooks/useCancelAppointment'
import { useMarkAllReadNotifications } from '../../../features/notification/hooks/useMarkAllReadNotifications'
import { useMarkReadNotification } from '../../../features/notification/hooks/useMarkReadNotification'
import { useNotifications } from '../../../features/notification/hooks/useNotifications'
import type { OwnerNotification } from '../../../features/notification/types'
import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'
import { formatDateTime } from '../../../src/utils/datetime'
import { apiErrorMessage } from '../../../src/utils/error'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

const TYPE_ICONS: Record<string, IconName> = {
  APPOINTMENT_CREATED: 'calendar-plus-outline',
  APPOINTMENT_CONFIRMED: 'calendar-check-outline',
  APPOINTMENT_CANCELLED: 'calendar-remove-outline',
  APPOINTMENT_RESCHEDULED: 'calendar-clock-outline',
  APPOINTMENT_REMINDER: 'bell-ring-outline',
  CONSULTATION_AVAILABLE: 'stethoscope',
  PRESCRIPTION_AVAILABLE: 'clipboard-text-outline',
  VACCINATION_REMINDER: 'needle',
  AI_SCREENING_COMPLETED: 'image-filter-center-focus',
  AI_SCREENING_REVIEWED: 'clipboard-check-outline',
  PAYMENT_COMPLETED: 'cash',
  PAYMENT_EXPIRED: 'clock-outline',
  SYSTEM: 'information-outline',
}

function formatTime(iso: string): string {
  return formatDateTime(iso, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function NotificationRow({
  notification,
  onPress,
  onApprove,
  onCancel,
  actionsDisabled,
  approving,
  cancelling,
}: {
  notification: OwnerNotification
  onPress: () => void
  onApprove: () => void
  onCancel: () => void
  actionsDisabled: boolean
  approving: boolean
  cancelling: boolean
}) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const showActions =
    notification.ntf_type === 'APPOINTMENT_RESCHEDULED' &&
    notification.reschedule_approval_pending

  return (
    <View style={styles.card}>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.cardMain}>
        <View style={[styles.iconCircle, notification.ntf_is_read && styles.iconCircleRead]}>
          <MaterialCommunityIcons
            color={notification.ntf_is_read ? colors.textMuted : colors.primary}
            name={TYPE_ICONS[notification.ntf_type] ?? 'bell-outline'}
            size={18}
          />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <Text numberOfLines={1} style={[styles.cardTitle, !notification.ntf_is_read && styles.cardTitleUnread]}>
              {notification.ntf_title}
            </Text>
            {!notification.ntf_is_read && <View style={styles.unreadDot} />}
          </View>
          <Text numberOfLines={2} style={styles.message}>{notification.ntf_message}</Text>
          <Text style={styles.time}>{formatTime(notification.ntf_created_at)}</Text>
        </View>
      </Pressable>

      {showActions ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityHint="Keeps this appointment at the new time"
            accessibilityLabel="Approve new appointment time"
            accessibilityRole="button"
            disabled={actionsDisabled}
            onPress={onApprove}
            style={[styles.approveButton, actionsDisabled && styles.actionDisabled]}
          >
            {approving ? (
              <ActivityIndicator color={colors.inverse} size="small" />
            ) : (
              <>
                <MaterialCommunityIcons color={colors.inverse} name="check" size={16} />
                <Text style={styles.approveText}>Approve</Text>
              </>
            )}
          </Pressable>
          <Pressable
            accessibilityHint="Cancels this appointment and releases the slot"
            accessibilityLabel="Cancel this appointment"
            accessibilityRole="button"
            disabled={actionsDisabled}
            onPress={onCancel}
            style={[styles.cancelAction, actionsDisabled && styles.actionDisabled]}
          >
            {cancelling ? (
              <ActivityIndicator color={colors.error} size="small" />
            ) : (
              <Text style={styles.cancelActionText}>Cancel appointment</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}

export default function NotificationsScreen() {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const router = useRouter()
  const { data, isError, isLoading } = useNotifications()
  const markRead = useMarkReadNotification()
  const markAllRead = useMarkAllReadNotifications()
  const approveReschedule = useApproveReschedule()
  const cancelAppointment = useCancelAppointment()
  const [actionAptId, setActionAptId] = useState<string | null>(null)

  const notifications = data?.results ?? []
  const unreadCount = notifications.filter((item) => !item.ntf_is_read).length

  const handlePress = (notification: OwnerNotification) => {
    if (!notification.ntf_is_read) {
      markRead.mutate(notification.ntf_id)
    }
    if (
      notification.ntf_reference_table === 'APPOINTMENT' &&
      notification.ntf_reference_id
    ) {
      router.push(`/(owner)/appointments/${notification.ntf_reference_id}`)
    } else if (notification.ntf_reference_table === 'PAYMENT') {
      // Payment ids are not appointment ids: open the receipts list instead.
      router.push('/(owner)/payments')
    }
  }

  const handleApprove = (notification: OwnerNotification) => {
    const aptId = notification.ntf_reference_id
    if (!aptId) return

    setActionAptId(aptId)
    approveReschedule.mutate(aptId, {
      onSuccess: () => {
        if (!notification.ntf_is_read) {
          markRead.mutate(notification.ntf_id)
        }
        Alert.alert('Schedule approved', 'Your appointment stays booked at the new time.')
      },
      onError: (error) => {
        Alert.alert("Couldn't approve schedule", apiErrorMessage(error))
      },
      onSettled: () => setActionAptId(null),
    })
  }

  const handleCancel = (notification: OwnerNotification) => {
    const aptId = notification.ntf_reference_id
    if (!aptId) return

    Alert.alert(
      'Cancel appointment?',
      'This releases your slot at the clinic. This action cannot be undone.',
      [
        { text: 'Keep appointment', style: 'cancel' },
        {
          text: 'Cancel appointment',
          style: 'destructive',
          onPress: () => {
            setActionAptId(aptId)
            cancelAppointment.mutate(
              { aptId },
              {
                onSuccess: () => {
                  if (!notification.ntf_is_read) {
                    markRead.mutate(notification.ntf_id)
                  }
                  Alert.alert('Appointment cancelled', 'Your slot has been released.')
                },
                onError: (error) => {
                  Alert.alert('Cancellation failed', apiErrorMessage(error))
                },
                onSettled: () => setActionAptId(null),
              },
            )
          },
        },
      ],
    )
  }

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <Pressable
              accessibilityRole="button"
              disabled={markAllRead.isPending}
              onPress={() => markAllRead.mutate()}
              style={styles.markAllButton}
            >
              <Text style={styles.markAllButtonText}>Mark all read</Text>
            </Pressable>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.statusState}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : isError ? (
            <Text style={styles.statusText}>
              We couldn&apos;t load your notifications. Please try again.
            </Text>
          ) : notifications.length > 0 ? (
            notifications.map((notification) => (
              <NotificationRow
                key={notification.ntf_id}
                actionsDisabled={actionAptId !== null}
                approving={
                  approveReschedule.isPending &&
                  actionAptId === notification.ntf_reference_id
                }
                cancelling={
                  cancelAppointment.isPending &&
                  actionAptId === notification.ntf_reference_id
                }
                notification={notification}
                onApprove={() => handleApprove(notification)}
                onCancel={() => handleCancel(notification)}
                onPress={() => handlePress(notification)}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons color={colors.textMuted} name="bell-check-outline" size={26} />
              <Text style={styles.statusText}>You&apos;re all caught up.</Text>
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
  title: { ...font.extrabold, color: colors.text, fontSize: 22 },
  markAllButton: { backgroundColor: colors.surfaceAlt, borderRadius: 10, minHeight: 36, paddingHorizontal: 14, justifyContent: 'center' },
  markAllButtonText: { ...font.bold, color: colors.primary, fontSize: 13 },
  list: { gap: 12, paddingBottom: 24, paddingTop: 20 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14 },
  cardMain: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  iconCircle: { alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  iconCircleRead: { backgroundColor: colors.surfaceAlt },
  cardBody: { flex: 1, gap: 4 },
  cardHeader: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  cardTitle: { ...font.semibold, color: colors.text, flex: 1, fontSize: 15 },
  cardTitleUnread: { ...font.extrabold },
  unreadDot: { backgroundColor: colors.primary, borderRadius: 4, height: 8, width: 8 },
  message: { ...font.regular, color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  time: { ...font.semibold, color: colors.textMuted, fontSize: 12 },
  actions: { borderTopColor: colors.borderLight, borderTopWidth: 1, flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12 },
  approveButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 10, flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 40, paddingHorizontal: 12 },
  approveText: { ...font.bold, color: colors.inverse, fontSize: 13 },
  cancelAction: { alignItems: 'center', borderColor: colors.border, borderRadius: 10, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 40, paddingHorizontal: 12 },
  cancelActionText: { ...font.bold, color: colors.error, fontSize: 13 },
  actionDisabled: { opacity: 0.6 },
  statusState: { alignItems: 'center', justifyContent: 'center', minHeight: 160 },
  emptyState: { alignItems: 'center', borderColor: colors.border, borderRadius: 14, borderStyle: 'dashed', borderWidth: 1, gap: 12, justifyContent: 'center', minHeight: 160, paddingHorizontal: 24 },
  statusText: { ...font.regular, color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
})
