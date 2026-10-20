import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'
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
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors } = useTheme()
  const { data: consultation, isLoading, isError, error } = useConsultation(id)
  const styles = useMemo(() => createStyles(colors), [colors])

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(owner)/records')
    }
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        hitSlop={8}
        onPress={handleBack}
        style={styles.headerBack}
      >
        <MaterialCommunityIcons color={colors.text} name="arrow-left" size={22} />
      </Pressable>
      <Text style={styles.headerTitle}>Consultation Details</Text>
      <View style={styles.headerRight} />
    </View>
  )

  if (isLoading) {
    return (
      <View style={styles.screen}>
        {renderHeader()}
        <View style={styles.stateContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.stateText}>Loading consultation...</Text>
        </View>
      </View>
    )
  }

  if (isError || !consultation) {
    return (
      <View style={styles.screen}>
        {renderHeader()}
        <View style={styles.stateContainer}>
          <MaterialCommunityIcons color={colors.error} name="alert-circle-outline" size={42} />
          <Text style={styles.stateText}>
            {(error as Error)?.message || 'Unable to load this consultation.'}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      {renderHeader()}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
    </View>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: { backgroundColor: colors.surface, flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', height: 48, marginBottom: 4, marginHorizontal: 10, marginTop: 4 },
  headerBack: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  headerTitle: { ...font.extrabold, color: colors.text, fontSize: 20, marginLeft: 2 },
  headerRight: { width: 48 },
  content: { gap: 14, paddingBottom: 32, paddingHorizontal: 20, paddingTop: 16 },
  stateContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  stateText: { ...font.regular, color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  headerCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  petName: { ...font.extrabold, color: colors.text, fontSize: 20 },
  meta: { ...font.regular, color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  diagnosisCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  diagnosisLabel: {
    ...font.bold,
    color: colors.primary,
    fontSize: 11,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  diagnosisText: { ...font.bold, color: colors.text, fontSize: 17 },
  treatmentText: { ...font.regular, color: colors.textSecondary, fontSize: 14, marginTop: 8 },
  section: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionTitle: {
    ...font.bold,
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  sectionBody: { ...font.regular, color: colors.text, fontSize: 14, lineHeight: 21 },
})
