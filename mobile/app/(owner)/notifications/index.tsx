import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useMemo, type ComponentProps } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'

import { useMarkAllReadNotifications } from '../../../features/notification/hooks/useMarkAllReadNotifications'
import { useMarkReadNotification } from '../../../features/notification/hooks/useMarkReadNotification'
import { useNotifications } from '../../../features/notification/hooks/useNotifications'
import type { OwnerNotification } from '../../../features/notification/types'
import { ErrorRetry } from '../../../src/components/ErrorRetry'
import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { usePullToRefresh } from '../../../src/hooks/usePullToRefresh'

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
  SYSTEM: 'information-outline',
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
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
  )
}

export default function NotificationsScreen() {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const router = useRouter()
  const { data, isError, isLoading, refetch } = useNotifications()
  const markRead = useMarkReadNotification()
  const markAllRead = useMarkAllReadNotifications()
  const { refreshing, onRefresh } = usePullToRefresh(refetch)

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
    }
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

        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl colors={[colors.primary]} onRefresh={onRefresh} refreshing={refreshing} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.statusState}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : isError ? (
            <ErrorRetry message="We couldn't load your notifications." onRetry={() => void refetch()} />
          ) : notifications.length > 0 ? (
            notifications.map((notification) => (
              <NotificationRow
                key={notification.ntf_id}
                notification={notification}
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
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  markAllButton: { backgroundColor: colors.surfaceAlt, borderRadius: 10, minHeight: 36, paddingHorizontal: 14, justifyContent: 'center' },
  markAllButtonText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  list: { gap: 12, paddingBottom: 24, paddingTop: 20 },
  card: { alignItems: 'flex-start', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  iconCircle: { alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  iconCircleRead: { backgroundColor: colors.surfaceAlt },
  cardBody: { flex: 1, gap: 4 },
  cardHeader: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  cardTitle: { color: colors.text, flex: 1, fontSize: 15, fontWeight: '600' },
  cardTitleUnread: { fontWeight: '800' },
  unreadDot: { backgroundColor: colors.primary, borderRadius: 4, height: 8, width: 8 },
  message: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  time: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  statusState: { alignItems: 'center', justifyContent: 'center', minHeight: 160 },
  emptyState: { alignItems: 'center', borderColor: colors.border, borderRadius: 14, borderStyle: 'dashed', borderWidth: 1, gap: 12, justifyContent: 'center', minHeight: 160, paddingHorizontal: 24 },
  statusText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
})
