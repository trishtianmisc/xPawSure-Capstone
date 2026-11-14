import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useMemo, type ComponentProps } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'
import { formatDateTime } from '../../../src/utils/datetime'
import { useClearNotifications } from '../hooks/useClearNotifications'
import { useMarkAllReadNotifications } from '../hooks/useMarkAllReadNotifications'
import { useMarkReadNotification } from '../hooks/useMarkReadNotification'
import { useNotifications } from '../hooks/useNotifications'
import type { OwnerNotification } from '../types'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

const TYPE_ICONS: Record<string, IconName> = {
  APPOINTMENT_CREATED: 'calendar-plus-outline',
  APPOINTMENT_CONFIRMED: 'calendar-check-outline',
  APPOINTMENT_CANCELLED: 'calendar-remove-outline',
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

function formatNotificationMessage(notification: OwnerNotification): string {
  if (
    notification.ntf_type === 'APPOINTMENT_CONFIRMED' &&
    notification.appointment_scheduled_at
  ) {
    const when = formatDateTime(notification.appointment_scheduled_at, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
    const pet = notification.pet_name ? ` for ${notification.pet_name}` : ''
    return `You have a new appointment scheduled on ${when}${pet}.`
  }

  return notification.ntf_message
}

function NotificationRow({
  notification,
  onPress,
}: {
  notification: OwnerNotification
  onPress: () => void
}) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      {notification.pet_profile_image ? (
        <Image
          accessibilityLabel={`${notification.pet_name ?? 'Pet'} profile photo`}
          source={{ uri: notification.pet_profile_image }}
          style={styles.petImage}
        />
      ) : (
        <View style={[styles.iconCircle, notification.ntf_is_read && styles.iconCircleRead]}>
          <MaterialCommunityIcons
            color={notification.ntf_is_read ? colors.textMuted : colors.primary}
            name={TYPE_ICONS[notification.ntf_type] ?? 'bell-outline'}
            size={18}
          />
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text numberOfLines={1} style={[styles.cardTitle, !notification.ntf_is_read && styles.cardTitleUnread]}>
            {notification.ntf_title}
          </Text>
          {!notification.ntf_is_read && <View style={styles.unreadDot} />}
        </View>
        <Text numberOfLines={3} style={styles.message}>
          {formatNotificationMessage(notification)}
        </Text>
        <Text style={styles.time}>{formatTime(notification.ntf_created_at)}</Text>
      </View>
    </Pressable>
  )
}

export function NotificationList({
  onOpenNotification,
}: {
  onOpenNotification: (notification: OwnerNotification) => void
}) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { data, isError, isLoading } = useNotifications()
  const markRead = useMarkReadNotification()
  const markAllRead = useMarkAllReadNotifications()
  const clearNotifications = useClearNotifications()

  const notifications = data?.results ?? []
  const unreadCount = notifications.filter((item) => !item.ntf_is_read).length

  const handlePress = (notification: OwnerNotification) => {
    if (!notification.ntf_is_read) {
      markRead.mutate(notification.ntf_id)
    }
    onOpenNotification(notification)
  }

  const handleClear = () => {
    Alert.alert(
      'Clear notifications',
      'Remove all notifications? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => clearNotifications.mutate(),
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
            <>
              {notifications.map((notification) => (
                <NotificationRow
                  key={notification.ntf_id}
                  notification={notification}
                  onPress={() => handlePress(notification)}
                />
              ))}
              <Pressable
                accessibilityRole="button"
                disabled={clearNotifications.isPending}
                onPress={handleClear}
                style={styles.clearButton}
              >
                {clearNotifications.isPending ? (
                  <ActivityIndicator color={colors.error} size="small" />
                ) : (
                  <MaterialCommunityIcons color={colors.error} name="trash-can-outline" size={18} />
                )}
                <Text style={styles.clearButtonText}>Clear notifications</Text>
              </Pressable>
            </>
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
  card: { alignItems: 'flex-start', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  petImage: { backgroundColor: colors.surfaceAlt, borderRadius: 12, height: 44, width: 44 },
  iconCircle: { alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  iconCircleRead: { backgroundColor: colors.surfaceAlt },
  cardBody: { flex: 1, gap: 4 },
  cardHeader: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  cardTitle: { ...font.semibold, color: colors.text, flex: 1, fontSize: 15 },
  cardTitleUnread: { ...font.extrabold },
  unreadDot: { backgroundColor: colors.primary, borderRadius: 4, height: 8, width: 8 },
  message: { ...font.regular, color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  time: { ...font.semibold, color: colors.textMuted, fontSize: 12 },
  clearButton: { alignItems: 'center', backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 4, minHeight: 44 },
  clearButtonText: { ...font.bold, color: colors.error, fontSize: 14 },
  statusState: { alignItems: 'center', justifyContent: 'center', minHeight: 160 },
  emptyState: { alignItems: 'center', borderColor: colors.border, borderRadius: 14, borderStyle: 'dashed', borderWidth: 1, gap: 12, justifyContent: 'center', minHeight: 160, paddingHorizontal: 24 },
  statusText: { ...font.regular, color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
})
