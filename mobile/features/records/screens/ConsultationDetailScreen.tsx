import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, type ComponentProps } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'
import { formatDate } from '../../../src/utils/datetime'
import { useConsultation } from '../hooks/useConsultation'
import { useMedicalRecordLinks } from '../hooks/useMedicalRecordLinks'
import { useRecordDetailBack } from '../lib/recordNavigation'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

function formatLongDate(iso: string): string {
  return formatDate(iso, { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateOnly(value: string): string {
  const parts = value.split('-')
  if (parts.length !== 3) return value

  const year = Number(parts[0])
  const month = Number(parts[1])
  const day = Number(parts[2])

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return value
  }

  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

interface ClinicalSectionProps {
  icon: IconName
  title: string
  value: string
}

function makeSection(
  icon: IconName,
  title: string,
  value: string | null,
): ClinicalSectionProps | null {
  return hasText(value) ? { icon, title, value } : null
}

function ClinicalSection({ icon, title, value }: ClinicalSectionProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <MaterialCommunityIcons color={colors.iconColor} name={icon} size={17} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionBody}>{value.trim()}</Text>
    </View>
  )
}

export default function ConsultationDetailScreen() {
  const { id, fromScreening } = useLocalSearchParams<{ id: string; fromScreening?: string }>()
  const router = useRouter()
  const { colors } = useTheme()
  const { data: consultation, isLoading, isError, error } = useConsultation(id)
  const styles = useMemo(() => createStyles(colors), [colors])
  const { viewScreening } = useMedicalRecordLinks()
  const handleBack = useRecordDetailBack(
    'consultations',
    fromScreening ? `/(owner)/screenings/${fromScreening}` : undefined,
  )

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

  const clinicalSections = [
    makeSection('message-alert-outline', 'Chief complaint', consultation.chief_complaint),
    makeSection('clipboard-text-search-outline', 'Observations', consultation.objective),
    makeSection('note-text-outline', 'Notes', consultation.notes),
  ].filter((section): section is ClinicalSectionProps => section !== null)
  const prescriptionId = consultation.prescription_id

  return (
    <View style={styles.screen}>
      {renderHeader()}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons color={colors.primary} name="stethoscope" size={22} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>Consultation record</Text>
              <Text style={styles.petName}>{consultation.pet_name}</Text>
            </View>
          </View>

          <View style={styles.metaList}>
            <View style={styles.metaRow}>
              <MaterialCommunityIcons
                color={colors.textMuted}
                name="calendar-blank-outline"
                size={15}
              />
              <Text style={styles.metaText}>{formatLongDate(consultation.created_at)}</Text>
            </View>
            <View style={styles.metaRow}>
              <MaterialCommunityIcons color={colors.textMuted} name="stethoscope" size={15} />
              <Text numberOfLines={2} style={styles.metaText}>
                {consultation.veterinarian}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.diagnosisCard}>
          <View style={styles.diagnosisHeader}>
            <View style={styles.diagnosisIcon}>
              <MaterialCommunityIcons
                color={colors.primary}
                name="clipboard-pulse-outline"
                size={18}
              />
            </View>
            <Text style={styles.diagnosisLabel}>Diagnosis</Text>
          </View>
          <Text style={styles.diagnosisText}>
            {consultation.diagnosis.trim() || 'Not recorded'}
          </Text>

          {hasText(consultation.specific_disease) ? (
            <View style={styles.specificDiseaseBlock}>
              <Text style={styles.specificDiseaseLabel}>Specific disease</Text>
              <Text style={styles.specificDiseaseText}>
                {consultation.specific_disease.trim()}
              </Text>
            </View>
          ) : null}
        </View>

        {clinicalSections.length > 0 ? (
          <View style={styles.clinicalGroup}>
            <Text style={styles.groupTitle}>Clinical notes</Text>
            {clinicalSections.map((section) => (
              <ClinicalSection key={section.title} {...section} />
            ))}
          </View>
        ) : null}

        {consultation.screening_id ? (
          <Pressable
            accessibilityLabel="View Screening"
            accessibilityRole="button"
            onPress={() => viewScreening(consultation.id, consultation.screening_id!, fromScreening)}
            style={({ pressed }) => [styles.prescriptionCard, pressed && styles.prescriptionCardPressed]}
          >
            <View style={styles.prescriptionIcon}>
              <MaterialCommunityIcons color={colors.primary} name="image-search-outline" size={20} />
            </View>
            <View style={styles.prescriptionCopy}>
              <Text style={styles.prescriptionTitle}>View Screening</Text>
              <Text style={styles.prescriptionText}>Open the skin screening linked to this visit.</Text>
            </View>
            <MaterialCommunityIcons color={colors.textMuted} name="chevron-right" size={20} />
          </Pressable>
        ) : null}

        {prescriptionId ? (
          <Pressable
            accessibilityLabel="View prescription"
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: '/(owner)/records/prescriptions/[id]',
                params: {
                  id: prescriptionId,
                  fromConsultation: consultation.id,
                },
              })
            }
            style={({ pressed }) => [
              styles.prescriptionCard,
              pressed && styles.prescriptionCardPressed,
            ]}
          >
            <View style={styles.prescriptionIcon}>
              <MaterialCommunityIcons color={colors.primary} name="pill" size={20} />
            </View>
            <View style={styles.prescriptionCopy}>
              <Text style={styles.prescriptionTitle}>Prescription</Text>
              <Text style={styles.prescriptionText}>
                View the medications prescribed for this visit.
              </Text>
            </View>
            <MaterialCommunityIcons color={colors.textMuted} name="chevron-right" size={20} />
          </Pressable>
        ) : (
          <View style={styles.prescriptionCard}>
            <View style={styles.prescriptionIcon}>
              <MaterialCommunityIcons
                color={colors.textMuted}
                name="file-document-outline"
                size={20}
              />
            </View>
            <View style={styles.prescriptionCopy}>
              <Text style={styles.prescriptionTitle}>Prescription</Text>
              <Text style={styles.prescriptionText}>
                No prescription was issued for this consultation.
              </Text>
            </View>
          </View>
        )}

        <View
          style={[styles.followUpCard, consultation.follow_up_required && styles.followUpCardActive]}
        >
          <View style={styles.followUpIcon}>
            <MaterialCommunityIcons
              color={consultation.follow_up_required ? colors.primary : colors.textMuted}
              name={
                consultation.follow_up_required
                  ? 'calendar-check-outline'
                  : 'check-circle-outline'
              }
              size={20}
            />
          </View>
          <View style={styles.followUpCopy}>
            <Text style={styles.followUpTitle}>
              {consultation.follow_up_required
                ? 'Follow-up recommended'
                : 'Follow-up not required'}
            </Text>
            <Text style={styles.followUpText}>
              {consultation.follow_up_required
                ? consultation.follow_up_target_date
                  ? `Preferred date: ${formatDateOnly(consultation.follow_up_target_date)}`
                  : 'Your veterinarian recommended a follow-up visit.'
                : 'No follow-up visit was requested for this consultation.'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    screen: { backgroundColor: colors.surface, flex: 1 },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      height: 48,
      marginBottom: 4,
      marginHorizontal: 10,
      marginTop: 4,
    },
    headerBack: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
    headerTitle: { ...font.extrabold, color: colors.text, fontSize: 20, marginLeft: 2 },
    headerRight: { width: 48 },
    content: { gap: 14, paddingBottom: 36, paddingHorizontal: 20, paddingTop: 16 },
    stateContainer: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      flex: 1,
      gap: 10,
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    stateText: {
      ...font.regular,
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
    heroCard: {
      backgroundColor: colors.surfaceAlt,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      gap: 14,
      padding: 18,
    },
    heroTop: { alignItems: 'center', flexDirection: 'row', gap: 13 },
    heroIcon: {
      alignItems: 'center',
      backgroundColor: colors.primaryLight,
      borderRadius: 14,
      height: 46,
      justifyContent: 'center',
      width: 46,
    },
    heroCopy: { flex: 1 },
    heroEyebrow: {
      ...font.bold,
      color: colors.primary,
      fontSize: 10,
      letterSpacing: 0.8,
      marginBottom: 3,
      textTransform: 'uppercase',
    },
    petName: { ...font.extrabold, color: colors.text, fontSize: 22 },
    metaList: { gap: 7 },
    metaRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
    metaText: { ...font.medium, color: colors.textSecondary, flexShrink: 1, fontSize: 13 },
    diagnosisCard: {
      backgroundColor: colors.primaryLight,
      borderRadius: 18,
      padding: 18,
    },
    diagnosisHeader: { alignItems: 'center', flexDirection: 'row', gap: 9, marginBottom: 8 },
    diagnosisIcon: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 9,
      height: 32,
      justifyContent: 'center',
      width: 32,
    },
    diagnosisLabel: {
      ...font.bold,
      color: colors.primary,
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    diagnosisText: { ...font.extrabold, color: colors.text, fontSize: 19, lineHeight: 26 },
    specificDiseaseBlock: {
      borderTopColor: colors.borderLight,
      borderTopWidth: StyleSheet.hairlineWidth,
      marginTop: 12,
      paddingTop: 11,
    },
    specificDiseaseLabel: {
      ...font.bold,
      color: colors.primary,
      fontSize: 10,
      letterSpacing: 0.5,
      marginBottom: 3,
      textTransform: 'uppercase',
    },
    specificDiseaseText: { ...font.semibold, color: colors.text, fontSize: 14, lineHeight: 20 },
    clinicalGroup: { gap: 12 },
    groupTitle: {
      ...font.bold,
      color: colors.textSecondary,
      fontSize: 11,
      letterSpacing: 0.8,
      marginLeft: 4,
      textTransform: 'uppercase',
    },
    section: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
    },
    sectionHeader: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 8 },
    sectionIcon: {
      alignItems: 'center',
      backgroundColor: colors.iconBg,
      borderRadius: 9,
      height: 30,
      justifyContent: 'center',
      width: 30,
    },
    sectionTitle: { ...font.bold, color: colors.text, fontSize: 13, letterSpacing: 0.2 },
    sectionBody: {
      ...font.regular,
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 21,
    },
    prescriptionCard: {
      alignItems: 'center',
      backgroundColor: colors.surfaceAlt,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 12,
      padding: 16,
    },
    prescriptionCardPressed: { opacity: 0.7 },
    prescriptionIcon: {
      alignItems: 'center',
      backgroundColor: colors.iconBg,
      borderRadius: 11,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    prescriptionCopy: { flex: 1 },
    prescriptionTitle: { ...font.bold, color: colors.text, fontSize: 14 },
    prescriptionText: {
      ...font.regular,
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 2,
    },
    followUpCard: {
      alignItems: 'center',
      backgroundColor: colors.surfaceAlt,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 12,
      padding: 16,
    },
    followUpCardActive: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.borderLight,
    },
    followUpIcon: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 11,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    followUpCopy: { flex: 1 },
    followUpTitle: { ...font.bold, color: colors.text, fontSize: 14 },
    followUpText: {
      ...font.regular,
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 2,
    },
  })
