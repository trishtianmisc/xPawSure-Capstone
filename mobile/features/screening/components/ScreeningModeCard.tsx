import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { Prediction } from '../../../ai/types/ai.types'
import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'
import { DISEASE_META } from '../constants'
import ConfidenceBar from './ConfidenceBar'

interface ScreeningModeCardProps {
  title: string
  subtitle: string
  predictions: Prediction[]
  accentColor: string
  icon: string
  badge?: string
  confidenceLabel: string
}

export default function ScreeningModeCard({
  title,
  subtitle,
  predictions,
  accentColor,
  icon,
  badge,
  confidenceLabel,
}: ScreeningModeCardProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  const top = predictions[0]
  if (!top) return null

  const topMeta = DISEASE_META[top.disease] ?? {
    color: colors.primary,
    icon: 'help-circle-outline',
  }
  const shown = predictions.slice(0, 3)

  return (
    <View style={[styles.card, { borderColor: accentColor + '30' }]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconCircle, { backgroundColor: accentColor + '18' }]}>
          <MaterialCommunityIcons color={accentColor} name={icon as any} size={24} />
        </View>
        <View style={styles.headerCopy}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            {badge ? (
              <View style={[styles.badge, { backgroundColor: accentColor + '18' }]}>
                <Text style={[styles.badgeText, { color: accentColor }]}>{badge}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <Text style={[styles.disease, { color: topMeta.color }]}>{top.label}</Text>
      <View style={styles.scoreRow}>
        <Text style={[styles.score, { color: topMeta.color }]}>{Math.round(top.confidence)}%</Text>
        <Text style={styles.scoreLabel}>{confidenceLabel}</Text>
      </View>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <View style={styles.bars}>
        {shown.map((prediction, index) => {
          const meta = DISEASE_META[prediction.disease] ?? { color: colors.primary }
          return (
            <ConfidenceBar
              key={prediction.disease}
              label={prediction.label}
              confidence={prediction.confidence}
              isTop={index === 0}
              color={meta.color}
            />
          )
        })}
      </View>
      {predictions.length > shown.length ? (
        <Text style={styles.moreText}>
          {predictions.length - shown.length} other conditions scored lower.
        </Text>
      ) : null}
    </View>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    padding: 20,
  },
  headerRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  iconCircle: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  headerCopy: { flex: 1 },
  titleRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  title: {
    ...font.semibold,
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  badge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { ...font.bold, fontSize: 9, letterSpacing: 0.4 },
  disease: { ...font.extrabold, fontSize: 22, marginTop: 14 },
  scoreRow: { alignItems: 'baseline', flexDirection: 'row', gap: 7, marginTop: 4 },
  score: { ...font.extrabold, fontSize: 30 },
  scoreLabel: { ...font.medium, color: colors.textMuted, flex: 1, fontSize: 12 },
  subtitle: {
    ...font.regular,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  bars: { marginTop: 16 },
  moreText: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: -2,
  },
})
