import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'
import { manilaDateKey } from '../../../src/utils/datetime'

export type VaccinationTone = 'overdue' | 'due' | 'ok'

export function vaccinationStatus(nextDue: string | null): { label: string; tone: VaccinationTone } | null {
  if (!nextDue) return null

  const todayKey = manilaDateKey()
  const dueKey = manilaDateKey(nextDue)
  if (!dueKey) return null
  const today = Date.parse(`${todayKey}T00:00:00Z`)
  const due = Date.parse(`${dueKey}T00:00:00Z`)

  const diffDays = Math.round((due - today) / 86400000)
  if (diffDays < 0) return { label: 'Overdue', tone: 'overdue' }
  if (diffDays <= 30) return { label: `Due in ${diffDays}d`, tone: 'due' }
  return { label: 'Up to date', tone: 'ok' }
}

export function VaccinationStatusPill({ nextDue }: { nextDue: string | null }) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const status = vaccinationStatus(nextDue)

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
