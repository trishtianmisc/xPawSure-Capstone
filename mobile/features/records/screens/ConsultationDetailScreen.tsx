import { useLocalSearchParams } from 'expo-router'
import { useMemo } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'

import { ErrorRetry } from '../../../src/components/ErrorRetry'
import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { apiErrorMessage } from '../../../src/utils/error'
import { useConsultation } from '../hooks/useConsultation'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function Section({ title, children }: { title: string; children: string }) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  )
}

export default function ConsultationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors } = useTheme()
  const { data: consultation, isLoading, isError, error, refetch, isRefetching } = useConsultation(id)
  const styles = useMemo(() => createStyles(colors), [colors])

  if (isLoading) {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.stateText}>Loading consultation...</Text>
      </View>
    )
  }

  if (isError || !consultation) {
    return (
      <View style={styles.stateContainer}>
        <ErrorRetry
          isRetrying={isRefetching}
          message={apiErrorMessage(error) || 'Unable to load this consultation.'}
          onRetry={() => void refetch()}
        />
      </View>
    )
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    >
      <View style={styles.headerCard}>
        <Text style={styles.petName}>{consultation.pet_name}</Text>
        <Text style={styles.meta}>
          {formatDate(consultation.created_at)} · {consultation.veterinarian}
        </Text>
      </View>

      <View style={styles.diagnosisCard}>
        <Text style={styles.diagnosisLabel}>Diagnosis</Text>
        <Text style={styles.diagnosisText}>{consultation.diagnosis}</Text>
        {consultation.treatment ? (
          <Text style={styles.treatmentText}>Treatment: {consultation.treatment}</Text>
        ) : null}
      </View>

      {consultation.chief_complaint ? (
        <Section title="Chief Complaint">{consultation.chief_complaint}</Section>
      ) : null}
      {consultation.subjective ? (
        <Section title="Subjective">{consultation.subjective}</Section>
      ) : null}
      {consultation.objective ? (
        <Section title="Objective">{consultation.objective}</Section>
      ) : null}
      {consultation.assessment ? (
        <Section title="Assessment">{consultation.assessment}</Section>
      ) : null}
      {consultation.plan ? (
        <Section title="Plan">{consultation.plan}</Section>
      ) : null}
      {consultation.notes ? (
        <Section title="Notes">{consultation.notes}</Section>
      ) : null}
    </ScrollView>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: { backgroundColor: colors.surface, flex: 1 },
  content: { gap: 14, paddingBottom: 32, paddingHorizontal: 20, paddingTop: 16 },
  stateContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  stateText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  headerCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  petName: { color: colors.text, fontSize: 20, fontWeight: '800' },
  meta: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  diagnosisCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  diagnosisLabel: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  diagnosisText: { color: colors.text, fontSize: 17, fontWeight: '700' },
  treatmentText: { color: colors.textSecondary, fontSize: 14, marginTop: 8 },
  section: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  sectionBody: { color: colors.text, fontSize: 14, lineHeight: 21 },
})
