import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'

const GUIDANCE = [
  'Keep the affected area clean and dry.',
  'Prevent licking or scratching; ask your vet about a cone if needed.',
  'Follow your veterinarian’s plan and avoid human medicines unless prescribed.',
  'Contact a vet promptly if the area worsens, spreads, or your pet seems unwell.',
]

export default function MockHomeCareCard() {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons color="#B25E09" name="home-heart" size={22} />
        </View>
        <View style={styles.headerCopy}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Home care</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>DEMO / MOCK CONTENT</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            Example supportive guidance only. This is not a treatment plan or a diagnosis.
          </Text>
        </View>
      </View>

      <View style={styles.list}>
        {GUIDANCE.map((item) => (
          <View key={item} style={styles.listItem}>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.listText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceAlt,
    borderColor: '#E9B96E',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  headerRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: '#FBE8C8',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerCopy: { flex: 1 },
  titleRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  title: { ...font.bold, color: colors.text, fontSize: 15 },
  badge: { backgroundColor: '#F3D49A', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { ...font.bold, color: '#6B3A0F', fontSize: 9, letterSpacing: 0.4 },
  subtitle: { ...font.regular, color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  list: { gap: 7, marginTop: 14 },
  listItem: { alignItems: 'flex-start', flexDirection: 'row', gap: 7 },
  dot: { ...font.bold, color: '#B25E09', fontSize: 12, lineHeight: 17 },
  listText: { ...font.regular, color: colors.textSecondary, flex: 1, fontSize: 12, lineHeight: 17 },
})
