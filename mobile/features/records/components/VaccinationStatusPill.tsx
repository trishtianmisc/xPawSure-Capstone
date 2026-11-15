import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'
import { vaccinationStatus } from '../lib/vaccinationStatus'

export type { VaccinationTone } from '../lib/vaccinationStatus'

export function VaccinationStatusPill({
  nextDue,
  isLatest = true,
}: {
  nextDue: string | null
  isLatest?: boolean
}) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const status = vaccinationStatus(nextDue, isLatest)

  if (!status) return null

  const toneStyle =
    status.tone === 'overdue' ? styles.overdue
      : status.tone === 'due' ? styles.due
        : styles.ok
  const textStyle =
    status.tone === 'overdue' ? styles.overdueText
      : status.tone === 'due' ? styles.dueText
        : styles.okText

  return (
    <View style={[styles.pill, toneStyle]}>
      <Text style={[styles.pillText, textStyle]}>{status.label}</Text>
    </View>
  )
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    pill: {
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    pillText: {
      ...font.bold,
      fontSize: 11,
    },
    overdue: {
      backgroundColor: '#FFE5E5',
    },
    overdueText: {
      color: '#D92D2D',
    },
    due: {
      backgroundColor: '#FFF4E0',
    },
    dueText: {
      color: '#B25E09',
    },
    ok: {
      backgroundColor: '#E5F9E7',
    },
    okText: {
      color: '#1B8A3B',
    },
  })
