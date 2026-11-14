import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'
import type { VetScreeningAnswer } from '../types'

const INITIAL_VISIBLE_ROWS = 3

export function SymptomAnswersCard({ rows }: { rows: VetScreeningAnswer[] }) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [expanded, setExpanded] = useState(false)

  if (rows.length === 0) return null

  const canToggle = rows.length > INITIAL_VISIBLE_ROWS
  const visibleRows = expanded ? rows : rows.slice(0, INITIAL_VISIBLE_ROWS)

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Questionnaire Answers</Text>
        {canToggle ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setExpanded((current) => !current)}
            style={styles.toggleButton}
          >
            <Text style={styles.toggleText}>{expanded ? 'Show less' : 'Show more'}</Text>
          </Pressable>
        ) : null}
      </View>

      {visibleRows.map((row, index) => (
        <View key={`${row.question}-${index}`} style={styles.row}>
          <Text style={styles.question}>{row.question}</Text>
          <Text style={styles.answer}>{row.answer}</Text>
        </View>
      ))}
    </View>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: { ...font.bold, color: colors.text, flexShrink: 1, fontSize: 15 },
  toggleButton: { paddingHorizontal: 2, paddingVertical: 2 },
  toggleText: { ...font.bold, color: colors.primary, fontSize: 13 },
  row: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 10,
  },
  question: { ...font.semibold, color: colors.text, fontSize: 13, lineHeight: 18 },
  answer: { ...font.regular, color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 2 },
})
