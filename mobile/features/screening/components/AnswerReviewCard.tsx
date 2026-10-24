import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { AnswerReviewRow, AnswerReviewStatus } from '../../../ai/decisionTree/types'
import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'

interface AnswerReviewCardProps {
  rows: AnswerReviewRow[]
  answersValid: boolean
  invalidAnswerQuestionIds: string[]
}

const STATUS_LABELS: Record<Exclude<AnswerReviewStatus, 'answered'>, string> = {
  'not-answered': 'Not answered',
  'not-asked': 'Not asked',
  invalid: 'Unavailable',
}

export default function AnswerReviewCard({
  rows,
  answersValid,
  invalidAnswerQuestionIds,
}: AnswerReviewCardProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const ordered = useMemo(
    () => [...rows].sort((a, b) => a.questionNumber - b.questionNumber),
    [rows],
  )
  const answeredCount = ordered.filter((row) => row.status === 'answered').length

  if (ordered.length === 0) return null

  const statusColor = (status: Exclude<AnswerReviewStatus, 'answered'>) => {
    if (status === 'invalid') return colors.error
    if (status === 'not-answered') return '#B25E09'
    return colors.textMuted
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Your answers</Text>
          <Text style={styles.subtitle}>
            Questions appear in the standard order. {answeredCount} of {ordered.length} answered.
          </Text>
        </View>
        <MaterialCommunityIcons color={colors.textMuted} name="clipboard-text-outline" size={22} />
      </View>

      {!answersValid ? (
        <View style={styles.warningRow}>
          <MaterialCommunityIcons color={colors.error} name="alert-circle-outline" size={15} />
          <Text style={[styles.warningText, { color: colors.error }]}>
            Questionnaire answers were missing or could not be read.
          </Text>
        </View>
      ) : null}

      {invalidAnswerQuestionIds.length > 0 ? (
        <View style={styles.warningRow}>
          <MaterialCommunityIcons color={colors.error} name="alert-circle-outline" size={15} />
          <Text style={[styles.warningText, { color: colors.error }]}>
            Some answers could not be validated.
          </Text>
        </View>
      ) : null}

      <View style={styles.rows}>
        {ordered.map((row, index) => {
          const selectedText = row.selected.map((item) => item.label).join(' · ')

          return (
            <View
              key={row.questionId}
              style={[styles.row, index < ordered.length - 1 && styles.rowBorder]}
            >
              <View style={styles.questionHeader}>
                <Text style={styles.questionNumber}>Q{row.questionNumber}</Text>
                {row.status !== 'answered' ? (
                  <Text style={[styles.status, { color: statusColor(row.status) }]}>
                    {STATUS_LABELS[row.status]}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.questionText}>{row.text}</Text>
              <Text
                style={[
                  styles.answerText,
                  row.status !== 'answered' && { color: statusColor(row.status) },
                ]}
              >
                {row.status === 'answered' ? selectedText : STATUS_LABELS[row.status]}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    padding: 18,
  },
  headerRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  headerCopy: { flex: 1 },
  title: { ...font.bold, color: colors.text, fontSize: 15 },
  subtitle: { ...font.regular, color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  warningRow: {
    alignItems: 'flex-start',
    backgroundColor: colors.errorBg,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  warningText: { ...font.medium, flex: 1, fontSize: 11, lineHeight: 16 },
  rows: { marginTop: 8 },
  row: { paddingVertical: 12 },
  rowBorder: { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  questionHeader: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  questionNumber: {
    ...font.bold,
    color: colors.primary,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  status: { ...font.semibold, fontSize: 10, letterSpacing: 0.2 },
  questionText: { ...font.medium, color: colors.text, fontSize: 13, lineHeight: 18, marginTop: 4 },
  answerText: { ...font.regular, color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 4 },
})
