import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'
import type { ClaudeAnalysisStatus, ClaudeFindings } from '../types'

/**
 * The subset of a Claude review the card renders. Stored screenings expose
 * the same shape minus `detail`, so both live responses and history records
 * are accepted.
 */
interface ClaudeReviewData {
  status: ClaudeAnalysisStatus
  result: ClaudeFindings | null
  detail?: string
}

interface ClaudeReviewCardProps {
  response: ClaudeReviewData | null
  requestFailed: boolean
}

function BulletList({ items, styles }: { items: string[]; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.bulletList}>
      {items.map((item, index) => (
        <View key={`${item}-${index}`} style={styles.bulletRow}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  )
}

function FindingsBody({
  findings,
  styles,
  colors,
}: {
  findings: ClaudeFindings
  styles: ReturnType<typeof createStyles>
  colors: AppColors
}) {
  return (
    <>
      <Text style={styles.fieldLabel}>Visible features</Text>
      <BulletList items={findings.visible_features ?? []} styles={styles} />

      <View style={styles.recommendationBox}>
        <MaterialCommunityIcons color={colors.primary} name="stethoscope" size={18} />
        <View style={styles.recommendationTextWrap}>
          <Text style={styles.fieldLabel}>Veterinary recommendation</Text>
          <Text style={styles.recommendationText}>{findings.vet_recommendation}</Text>
        </View>
      </View>
    </>
  )
}

export function ClaudeReviewCard({ response, requestFailed }: ClaudeReviewCardProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const findings = response?.status === 'OK' ? response.result : null

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons color={colors.primary} name="eye-outline" size={18} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Independent Image Review</Text>
          <Text style={styles.subtitle}>
            Used to decide whether on-device screening is appropriate. It does not confirm
            the on-device result and is not a diagnosis.
          </Text>
        </View>
      </View>

      {!response && (
        <View style={styles.statusBox}>
          <MaterialCommunityIcons color={colors.textMuted} name="cloud-off-outline" size={18} />
          <Text style={styles.statusText}>
            {requestFailed
              ? 'The image review could not be reached, so on-device screening was not run.'
              : 'No image review was completed.'}
          </Text>
        </View>
      )}

      {response && !findings && (
        <View style={styles.statusBox}>
          <MaterialCommunityIcons color={colors.textMuted} name="information-outline" size={18} />
          <View style={styles.statusTextWrap}>
            <Text style={styles.statusTitle}>Review not available</Text>
            <Text style={styles.statusText}>
              {response.detail || 'The image review did not complete.'}
            </Text>
          </View>
        </View>
      )}

      {findings && <FindingsBody colors={colors} findings={findings} styles={styles} />}
    </View>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 16,
    padding: 18,
  },
  headerRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerText: { flex: 1, gap: 3 },
  title: { ...font.bold, color: colors.text, fontSize: 15 },
  subtitle: { ...font.regular, color: colors.textMuted, fontSize: 11, lineHeight: 16 },

  fieldLabel: {
    ...font.bold,
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  bulletList: { gap: 4 },
  bulletRow: { flexDirection: 'row', gap: 7 },
  bulletDot: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  bulletText: { ...font.regular, color: colors.text, flex: 1, fontSize: 12, lineHeight: 18 },

  recommendationBox: {
    alignItems: 'flex-start',
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  recommendationTextWrap: { flex: 1, gap: 3 },
  recommendationText: { ...font.regular, color: colors.text, fontSize: 12, lineHeight: 18 },

  statusBox: {
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  statusTextWrap: { flex: 1, gap: 2 },
  statusTitle: { ...font.semibold, color: colors.text, fontSize: 12 },
  statusText: { ...font.regular, color: colors.textSecondary, flex: 1, fontSize: 12, lineHeight: 17 },
})
