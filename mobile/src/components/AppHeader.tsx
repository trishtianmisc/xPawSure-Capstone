import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export function AppHeader() {
  const { colors, theme, toggleTheme } = useTheme()
  const { user } = useAuth()
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, borderBottomColor: colors.border, paddingTop: insets.top + 4 }]}>
      <View style={styles.left}>
        <Image
          source={theme === 'dark' ? require('../../assets/Xpaw_Logo_ForDark.png') : require('../../assets/Xpaw_Logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.brand, { color: colors.primary }]}>xPawSure</Text>
      </View>

      <View style={styles.right}>
        <Pressable style={[styles.iconBtn, { backgroundColor: colors.iconBg }]}>
          <View style={[styles.notifDot, { backgroundColor: colors.error }]} />
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
  left: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  logo: { height: 28, width: 28 },
  brand: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  right: { alignItems: 'center', flexDirection: 'row', gap: 8 },
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
  avatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
})
