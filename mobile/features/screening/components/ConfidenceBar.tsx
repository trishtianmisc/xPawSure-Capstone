import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'

interface ConfidenceBarProps {
  label: string
  confidence: number
  isTop: boolean
  color: string
}

export default function ConfidenceBar({
  label,
  confidence,
  isTop,
  color,
}: ConfidenceBarProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const pct = Math.round(confidence)

  return (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, isTop && { color: colors.text }]} numberOfLines={1}>
          {isTop ? '★ ' : '  '}{label}
        </Text>
        <Text style={[styles.pct, isTop && { ...font.bold, color: colors.text }]}>{pct}%</Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: isTop ? color : colors.border,
              width: `${pct}%`,
            },
          ]}
        />
      </View>
    </View>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  row: { gap: 6, marginBottom: 14 },
  labelRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  label: { ...font.medium, color: '#A0A0A0', flex: 1, fontSize: 13 },
  pct: {
    ...font.semibold,
    color: '#A0A0A0',
    fontSize: 13,
    marginLeft: 8,
    minWidth: 36,
    textAlign: 'right',
  },
  track: { borderRadius: 4, height: 8, overflow: 'hidden', width: '100%' },
  fill: { borderRadius: 4, height: '100%' },
})
