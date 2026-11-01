import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'

export interface SymptomRow {
  question: string
  answer: string
}

interface SymptomSummaryCardProps {
  rows: SymptomRow[]
  answeredCount?: number
  totalQuestions?: number
}

/**
 * Supplementary questionnaire summary. Display context only: these answers
 * never modify the AI prediction, confidence, review status, or booking.
 * Renders nothing when there are no rows (e.g. screenings saved without a
 * questionnaire or records that predate answer storage).
 */
export function SymptomSummaryCard({
  rows,
  answeredCount,
  totalQuestions,
}: SymptomSummaryCardProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  if (rows.length === 0) return null

  const count =
    answeredCount !== undefined && totalQuestions !== undefined
      ? ` (${answeredCount} of ${totalQuestions})`
      : ''

  return (
    <>
      <Text style={styles.sectionLabel}>Symptom Summary · Supplementary</Text>
      <View style={styles.card}>
        <Text style={styles.title}>Your questionnaire answers{count}</Text>
        {rows.map((row) => (
          <View key={row.question} style={styles.row}>
            <Text style={styles.question}>{row.question}</Text>
            <Text style={styles.answer}>{row.answer}</Text>
          </View>
        ))}
        <Text style={styles.note}>
          Supplementary context for your veterinarian. These answers do not change
          the AI prediction or confidence shown above.
        </Text>
      </View>
    </>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  sectionLabel: {
    ...font.bold,
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    padding: 18,
  },
  title: { ...font.bold, color: colors.text, fontSize: 15, marginBottom: 16 },
  row: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 10,
  },
  question: { ...font.semibold, color: colors.text, fontSize: 13, lineHeight: 18 },
  answer: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 2 },
  note: {
    color: colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 17,
    marginTop: 10,
    textAlign: 'center',
  },
})
