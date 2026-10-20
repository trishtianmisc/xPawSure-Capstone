import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useUnreadCount } from '../../features/notification/hooks/useUnreadCount'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { font } from '../theme/typography'

export function AppHeader() {
  const { colors, theme, toggleTheme } = useTheme()
  const { user } = useAuth()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const isOwner = user?.role === 'OWNER'
  const { data: unreadCount } = useUnreadCount(isOwner)

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, borderBottomColor: colors.border, paddingTop: insets.top + 4 }]}>
      <View style={styles.left}>
        <View style={styles.logoWrap}>
          <Image
            source={require('../../assets/xpawsure-logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="XPawSure"
          />
        </View>
        <Text style={[styles.brand, { color: colors.primary }]}>XPawsure</Text>
      </View>

      <View style={styles.right}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          disabled={!isOwner}
          onPress={isOwner ? () => router.push('/(owner)/notifications') : undefined}
          style={[styles.iconBtn, { backgroundColor: colors.iconBg }]}
        >
          {(unreadCount ?? 0) > 0 && <View style={[styles.notifDot, { backgroundColor: colors.error }]} />}
          <MaterialCommunityIcons color={colors.iconColor} name="bell-outline" size={19} />
        </Pressable>

        <Pressable onPress={toggleTheme} style={[styles.iconBtn, { backgroundColor: colors.iconBg }]}>
          <MaterialCommunityIcons color={colors.iconColor} name={theme === 'dark' ? 'weather-sunny' : 'weather-night'} size={19} />
        </Pressable>

        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {(user?.first_name?.[0] || user?.email?.[0] || '?').toUpperCase()}
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
  left: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  logo: { height: 23, width: 23 },
  brand: { ...font.extrabold, fontSize: 20, letterSpacing: -0.3 },
  right: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  logoWrap: {
    alignItems: 'center',
    backgroundColor: '#F8C98F',
    borderColor: '#8B4324',
    borderRadius: 15,
    borderWidth: 2,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  iconBtn: {
    alignItems: 'center',
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  notifDot: {
    borderRadius: 4,
    height: 8,
    position: 'absolute',
    right: 6,
    top: 6,
    width: 8,
    zIndex: 1,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    marginLeft: 4,
    width: 32,
  },
  avatarText: { ...font.bold, color: '#FFFFFF', fontSize: 14 },
})
