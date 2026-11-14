import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useEffect, useMemo, useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'

interface VetPetHeroProps {
  petName: string
  breed?: string | null
  imageUrl?: string | null
  onHistoryPress?: () => void
}

export function VetPetHero({
  petName,
  breed,
  imageUrl,
  onHistoryPress,
}: VetPetHeroProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [imageUrl])

  return (
    <View style={styles.hero}>
      <View pointerEvents="none" style={styles.heroPattern}>
        <MaterialCommunityIcons color="rgba(253, 230, 138, 0.20)" name="paw" size={54} style={styles.heroPawOne} />
        <MaterialCommunityIcons color="rgba(245, 213, 183, 0.16)" name="paw" size={34} style={styles.heroPawTwo} />
        <MaterialCommunityIcons color="rgba(255,255,255,0.10)" name="paw" size={22} style={styles.heroPawThree} />
      </View>
      <View style={styles.heroRow}>
        {imageUrl && !imageFailed ? (
          <Image
            accessibilityLabel={`${petName} profile picture`}
            onError={() => setImageFailed(true)}
            source={{ uri: imageUrl }}
            style={styles.heroAvatar}
          />
        ) : (
          <View style={[styles.heroAvatar, styles.heroAvatarFallback]}>
            <MaterialCommunityIcons color="#FDE68A" name="paw" size={22} />
          </View>
        )}
        <View style={styles.heroCopy}>
          <View style={styles.heroNameRow}>
            <Text numberOfLines={2} style={styles.heroName}>{petName}</Text>
            {onHistoryPress ? (
              <Pressable
                accessibilityHint="Opens this pet's previous consultations at your clinic"
                accessibilityLabel="History"
                accessibilityRole="button"
                onPress={onHistoryPress}
                style={styles.historyButton}
              >
                <Text style={styles.historyButtonText}>History</Text>
              </Pressable>
            ) : null}
          </View>
          <Text numberOfLines={1} style={styles.heroBreed}>{breed ?? '—'}</Text>
        </View>
      </View>
    </View>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  hero: {
    backgroundColor: colors.primaryDark,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    padding: 14,
  },
  heroPattern: { ...StyleSheet.absoluteFillObject },
  heroPawOne: { position: 'absolute', right: 28, top: -10, transform: [{ rotate: '24deg' }] },
  heroPawTwo: { bottom: -12, position: 'absolute', right: 72, transform: [{ rotate: '-18deg' }] },
  heroPawThree: { bottom: 8, position: 'absolute', right: 12, transform: [{ rotate: '12deg' }] },
  heroRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  heroAvatar: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    borderWidth: 2,
    height: 52,
    width: 52,
  },
  heroAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1, minWidth: 0 },
  heroNameRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 8 },
  heroName: { ...font.extrabold, color: '#FFFFFF', flex: 1, fontSize: 18, lineHeight: 22, minWidth: 0 },
  heroBreed: { ...font.medium, color: '#FDE68A', fontSize: 12, lineHeight: 16, marginTop: 1 },
  historyButton: { alignSelf: 'flex-start', flexShrink: 0, marginRight: 5, marginTop: -17, paddingVertical: 2 },
  historyButtonText: {
    ...font.bold,
    color: '#FDE68A',
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'right',
    textDecorationLine: 'underline',
  },
})
