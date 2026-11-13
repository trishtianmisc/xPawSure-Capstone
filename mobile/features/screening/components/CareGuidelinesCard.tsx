import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'
import {
  CARE_GUIDELINE_DISCLAIMER,
  GENERAL_CONSULT_MESSAGE,
  getCareGuideline,
} from '../data/careGuidelines'

interface CareGuidelinesCardProps {
  /** Primary raw AI predicted class (e.g. top prediction or saved disease_code). */
  prediction?: string | null
  /** Overrides the default section label. */
  title?: string
  /** Overrides the default disclaimer footnote. */
  note?: string
}

/**
 * Display-only, veterinarian-approved care steps selected from static data by
 * the primary raw AI predicted class. The questionnaire never selects or
 * alters the content, and this card can never modify the AI prediction,
 * confidence, saved result, or booking. Renders the general consultation
 * message when the predicted class is missing or unsupported.
 */
export function CareGuidelinesCard({ prediction, title, note }: CareGuidelinesCardProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const guideline = useMemo(() => getCareGuideline(prediction), [prediction])

  return (
    <>
      <Text style={styles.sectionLabel}>{title ?? 'Care Guidelines'}</Text>
      <View style={styles.card}>
        <Text style={styles.disclaimerBadge}>Veterinarian-Approved Guidance</Text>
        <Text style={styles.title}>{guideline ? guideline.title : 'Consult a Veterinarian'}</Text>

        {guideline ? (
          <View style={styles.block}>
            <Text style={styles.blockLabel}>Care Steps</Text>
            {guideline.careSteps.map((item) => (
              <View key={item} style={styles.bulletRow}>
                <Text style={styles.bulletMark}>{'\u2022'}</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.overview}>{GENERAL_CONSULT_MESSAGE}</Text>
        )}

        <Text style={styles.note}>{note ?? CARE_GUIDELINE_DISCLAIMER}</Text>
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
  disclaimerBadge: {
    ...font.bold,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    fontSize: 10,
    letterSpacing: 0.3,
    marginBottom: 10,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    textTransform: 'uppercase',
  },
  title: { ...font.extrabold, color: colors.text, fontSize: 17 },
  overview: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  block: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
  },
  blockLabel: { ...font.bold, color: colors.text, fontSize: 13, marginBottom: 6 },
  bulletRow: { flexDirection: 'row', marginTop: 3 },
  bulletMark: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginRight: 8 },
  bulletText: { color: colors.textSecondary, fontSize: 13, flex: 1, lineHeight: 18 },
  note: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 16,
    marginTop: 12,
    textAlign: 'center',
  },
})
