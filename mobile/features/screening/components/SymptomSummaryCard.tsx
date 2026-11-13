import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'

export interface SymptomRow {
  question: string
  answer: string
}

/** Number of answers shown while the collapsible card is collapsed. */
const PREVIEW_COUNT = 3

interface SymptomSummaryCardProps {
  rows: SymptomRow[]
  answeredCount?: number
  totalQuestions?: number
  /** Overrides the default owner-facing title (e.g. vet view wording). */
  title?: string
  /** Overrides the default owner-facing footnote. */
  note?: string
  /**
   * When true, shows only the first `PREVIEW_COUNT` answers initially with a
   * "View more" toggle. Defaults to false so existing callers keep rendering
   * every answer.
   */
  collapsible?: boolean
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
  title,
  note,
  collapsible = false,
}: SymptomSummaryCardProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [expanded, setExpanded] = useState(false)

  if (rows.length === 0) return null

  const count =
    answeredCount !== undefined && totalQuestions !== undefined
      ? ` (${answeredCount} of ${totalQuestions})`
      : ''

  const toggleable = collapsible && rows.length > PREVIEW_COUNT
  const visibleRows = toggleable && !expanded ? rows.slice(0, PREVIEW_COUNT) : rows

  return (
    <>
      <Text style={styles.sectionLabel}>Symptom Summary · Supplementary</Text>
      <View style={styles.card}>
        <Text style={styles.title}>{title ?? 'Your questionnaire answers'}{count}</Text>
        {visibleRows.map((row) => (
          <View key={row.question} style={styles.row}>
            <Text style={styles.question}>{row.question}</Text>
            <Text style={styles.answer}>{row.answer}</Text>
          </View>
        ))}
        {toggleable && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              expanded ? 'View less questionnaire answers' : 'View more questionnaire answers'
            }
            accessibilityState={{ expanded }}
            hitSlop={8}
            onPress={() => setExpanded((prev) => !prev)}
            style={styles.toggleBtn}
          >
            <Text style={styles.toggleText}>{expanded ? 'View less' : 'View more'}</Text>
            <MaterialCommunityIcons
              color={colors.primary}
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
            />
          </Pressable>
        )}
        <Text style={styles.note}>
          {note ??
            'Supplementary context for your veterinarian. These answers do not change the AI prediction or confidence shown above.'}
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
  toggleBtn: {
    alignItems: 'center',
    alignSelf: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    minHeight: 44,
    marginTop: 10,
    paddingHorizontal: 12,
  },
  toggleText: { ...font.semibold, color: colors.primary, fontSize: 13 },
  note: {
    color: colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 17,
    marginTop: 10,
    textAlign: 'center',
  },
})
