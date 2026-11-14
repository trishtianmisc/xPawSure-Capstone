import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useMemo, useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'
import { formatAppointmentStatus } from '../lib/format'
import { APPOINTMENT_STATUS_COLORS } from '../lib/statusColors'
import type { AppointmentStatus } from '../types'

interface VetAppointmentCardProps {
  petName: string
  breed?: string | null
  imageUrl?: string | null
  meta: string
  status?: AppointmentStatus | null
  onPress: () => void
}

interface PawPrint {
  left: `${number}%`
  top: number
  size: number
  rotate: `${number}deg`
}

const PAW_PRINTS: PawPrint[] = [
  { left: '1%', top: -16, size: 32, rotate: '-18deg' },
  { left: '20%', top: -24, size: 20, rotate: '15deg' },
  { left: '42%', top: -20, size: 26, rotate: '-30deg' },
  { left: '69%', top: -18, size: 34, rotate: '12deg' },
  { left: '90%', top: -14, size: 18, rotate: '24deg' },
  { left: '3%', top: 26, size: 16, rotate: '8deg' },
  { left: '21%', top: 34, size: 22, rotate: '-12deg' },
  { left: '55%', top: 30, size: 16, rotate: '30deg' },
  { left: '76%', top: 26, size: 24, rotate: '-22deg' },
  { left: '4%', top: 54, size: 28, rotate: '18deg' },
  { left: '40%', top: 48, size: 18, rotate: '-16deg' },
  { left: '63%', top: 56, size: 20, rotate: '10deg' },
  { left: '90%', top: 50, size: 30, rotate: '-8deg' },
]

export function VetAppointmentCard({
  petName,
  breed,
  imageUrl,
  meta,
  status,
  onPress,
}: VetAppointmentCardProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = !!imageUrl && !imageFailed
  const statusStyle = status ? APPOINTMENT_STATUS_COLORS[status] : null

  return (
    <Pressable
      accessibilityLabel={`${petName}, ${meta}${status ? `, ${formatAppointmentStatus(status)}` : ''}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View pointerEvents="none" style={styles.pattern}>
        {PAW_PRINTS.map((paw) => (
          <MaterialCommunityIcons
            color={colors.iconBg}
            key={`${paw.left}-${paw.top}`}
            name="paw"
            size={paw.size}
            style={[
              styles.paw,
              { left: paw.left, top: paw.top, transform: [{ rotate: paw.rotate }] },
            ]}
          />
        ))}
      </View>

      <View style={styles.topRow}>
        <Text numberOfLines={1} style={styles.meta}>{meta}</Text>
        {statusStyle ? (
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
              {formatAppointmentStatus(status as AppointmentStatus)}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.heroRow}>
        {showImage ? (
          <Image
            accessibilityLabel={`${petName} profile picture`}
            onError={() => setImageFailed(true)}
            source={{ uri: imageUrl as string }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <MaterialCommunityIcons color={colors.primary} name="paw" size={20} />
          </View>
        )}
        <View style={styles.heroCopy}>
          <Text numberOfLines={1} style={styles.petName}>{petName}</Text>
          {!!breed && <Text numberOfLines={1} style={styles.breed}>{breed}</Text>}
        </View>
      </View>
    </Pressable>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'relative',
  },
  cardPressed: { opacity: 0.7 },
  pattern: { ...StyleSheet.absoluteFillObject },
  paw: { position: 'absolute' },
  topRow: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between', marginBottom: 3 },
  meta: { ...font.bold, color: colors.text, flexShrink: 1, fontSize: 12, lineHeight: 16 },
  statusBadge: { borderRadius: 8, flexShrink: 0, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { ...font.bold, fontSize: 10 },
  heroRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  avatar: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderLight,
    borderRadius: 10,
    borderWidth: 1,
    height: 34,
    width: 34,
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1, minWidth: 0 },
  petName: { ...font.bold, color: colors.text, fontSize: 15, lineHeight: 18 },
  breed: { ...font.regular, color: colors.textSecondary, fontSize: 12, lineHeight: 15, marginTop: 1 },
})
