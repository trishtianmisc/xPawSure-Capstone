import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'
import { formatShortDate } from '../lib/format'
import type { VetConsultationInfo, VetScreeningSummary } from '../types'

function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function matchesAiScreening(
  screening: VetScreeningSummary | null | undefined,
  diagnosis: string | null | undefined,
): boolean {
  if (!screening?.disease || !diagnosis?.trim()) return false
  const disease = normalize(screening.disease)
  const vet = normalize(diagnosis)
  if (!disease || !vet) return false
  return vet === disease || vet.includes(disease) || disease.includes(vet)
}

export function ConsultationSummary({
  consultation,
  screening,
}: {
  consultation: VetConsultationInfo
  screening?: VetScreeningSummary | null
}) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const aiMatch = matchesAiScreening(screening, consultation.diagnosis)

  const meta = [consultation.veterinarian, formatShortDate(consultation.created_at)]
    .filter((value) => value.trim().length > 0)
    .join(' · ')

  const fields = [
    { label: 'Chief complaint', value: consultation.chief_complaint },
    { label: 'Subjective', value: consultation.subjective },
    { label: 'Objective', value: consultation.objective },
    { label: 'Assessment', value: consultation.assessment },
    { label: 'Plan', value: consultation.plan },
    { label: 'Specific disease', value: consultation.specific_disease },
    { label: 'Notes', value: consultation.notes },
  ].filter((field) => hasText(field.value))

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Consultation</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}

      <View style={styles.diagnosisCard}>
        <Text style={styles.diagnosisLabel}>Diagnosis</Text>
        <Text style={styles.diagnosisText}>{consultation.diagnosis.trim() || '—'}</Text>
        {hasText(consultation.treatment) ? (
          <Text style={styles.treatmentText}>Treatment: {consultation.treatment}</Text>
        ) : null}
        {screening ? (
          <View style={styles.agreementRow}>
            <Text style={styles.agreementLabel}>Diagnosis Agreement</Text>
            <View
              style={[
                styles.agreementPill,
                { backgroundColor: aiMatch ? '#D5F5E3' : '#FADBD8' },
              ]}
            >
              <Text
                style={[
                  styles.agreementPillText,
                  { color: aiMatch ? '#27AE60' : '#E74C3C' },
                ]}
              >
                {aiMatch ? 'Matched' : 'Not matched'}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {fields.map((field) => (
        <View key={field.label} style={styles.field}>
          <Text style={styles.fieldLabel}>{field.label}</Text>
          <Text style={styles.fieldValue}>{field.value}</Text>
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
    marginBottom: 16,
    padding: 16,
  },
  title: { ...font.extrabold, color: colors.text, fontSize: 17 },
  meta: { ...font.regular, color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  diagnosisCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    marginTop: 14,
    padding: 14,
  },
  diagnosisLabel: {
    ...font.bold,
    color: colors.primary,
    fontSize: 11,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  diagnosisText: { ...font.bold, color: colors.text, fontSize: 16, lineHeight: 22 },
  treatmentText: {
    ...font.regular,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  agreementRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
  },
  agreementLabel: { ...font.medium, color: colors.textSecondary, fontSize: 13 },
  agreementPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  agreementPillText: { ...font.bold, fontSize: 12 },
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
})
