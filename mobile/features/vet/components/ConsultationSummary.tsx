import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'
import { formatShortDate } from '../lib/format'
import type { VetConsultationInfo } from '../types'

function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function ConsultationSummary({
  consultation,
  showTitle = true,
  collapsible = false,
  onMoreDetails,
}: {
  consultation: VetConsultationInfo
  showTitle?: boolean
  collapsible?: boolean
  onMoreDetails?: () => void
}) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [expanded, setExpanded] = useState(!collapsible)

  const meta = [consultation.veterinarian, formatShortDate(consultation.created_at)]
    .filter((value) => value.trim().length > 0)
    .join(' · ')

  const fields = [
    { label: 'Diagnosis', value: consultation.diagnosis, bold: true },
    { label: 'Treatment', value: consultation.treatment, bold: false },
    { label: 'Chief complaint', value: consultation.chief_complaint, bold: false },
    { label: 'Subjective', value: consultation.subjective, bold: false },
    { label: 'Objective', value: consultation.objective, bold: false },
    { label: 'Assessment', value: consultation.assessment, bold: false },
    { label: 'Plan', value: consultation.plan, bold: false },
    { label: 'Specific disease', value: consultation.specific_disease, bold: false },
    { label: 'Notes', value: consultation.notes, bold: false },
  ].filter((field) => hasText(field.value))

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        {showTitle ? <Text style={styles.title}>Consultation</Text> : <View />}
        {collapsible ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            onPress={() => setExpanded((current) => !current)}
            style={styles.dropdownButton}
          >
            <Text style={styles.dropdownText}>{expanded ? 'Hide details' : 'Details'}</Text>
            <MaterialCommunityIcons
              color={colors.primary}
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
            />
          </Pressable>
        ) : null}
      </View>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}

      {expanded
        ? fields.map((field, index) => (
            <View key={field.label} style={[styles.field, index === 0 && styles.firstField]}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <Text style={[styles.fieldValue, field.bold && styles.diagnosisValue]}>
                {field.value}
              </Text>
            </View>
          ))
        : null}

      {expanded && onMoreDetails ? (
        <Pressable accessibilityRole="link" onPress={onMoreDetails} style={styles.moreDetailsButton}>
          <Text style={styles.moreDetailsText}>More details</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  headerRow: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  title: { ...font.extrabold, color: colors.text, flexShrink: 1, fontSize: 17 },
  dropdownButton: { alignItems: 'center', flexDirection: 'row', gap: 2, paddingVertical: 2 },
  dropdownText: { ...font.semibold, color: colors.primary, fontSize: 12 },
  meta: { ...font.regular, color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  firstField: {
    borderTopWidth: 0,
    marginTop: 14,
    paddingTop: 0,
  },
  field: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
  },
  fieldLabel: {
    ...font.bold,
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  fieldValue: { ...font.regular, color: colors.text, fontSize: 14, lineHeight: 21 },
  diagnosisValue: { ...font.bold, color: colors.text, fontSize: 16, lineHeight: 22 },
  moreDetailsButton: { alignSelf: 'flex-end', marginTop: 14, paddingVertical: 2 },
  moreDetailsText: {
    ...font.bold,
    color: colors.primary,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
})
