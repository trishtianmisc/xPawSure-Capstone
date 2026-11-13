import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo } from 'react'
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'
import { formatDateTime as formatManilaDateTime } from '../../../src/utils/datetime'
import { KNOWLEDGE } from '../../../ai/decisionTree/knowledge'
import { CareGuidelinesCard } from '../components/CareGuidelinesCard'
import { SymptomSummaryCard } from '../components/SymptomSummaryCard'
import { DISEASE_META, BOOKED_PILL } from '../constants'
import { useAllScreenings } from '../hooks/useAllScreenings'

/**
 * Read-only view of one stored screening log: what the on-device model
 * recorded, plus sample care guidelines keyed to the saved prediction.
 * The image-validation gate, stored review, and cross-analysis data are
 * kept on the backend for audit but are not rendered here.
 * Booking never starts here — the Book Appointment action lives only on
 * the fresh scan result screen.
 */

function formatDateTime(iso: string): string {
  return formatManilaDateTime(iso, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function ScreeningDetailsScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { data, isLoading, isError } = useAllScreenings()
  const { id } = useLocalSearchParams<{ id?: string }>()

  const screening = useMemo(
    () => (id ? data?.results.find((current) => current.ais_id === id) : undefined),
    [data, id],
  )

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(owner)/screenings')
    }
  }

  const diseaseMeta = screening ? DISEASE_META[screening.disease_code] ?? null : null
  const diseaseColor: string = diseaseMeta?.color ?? colors.primary
  // Supplementary answers are absent on screenings saved without a
  // questionnaire or records that predate their storage — hide the section.
  const symptomRows = screening?.symptom_answers ?? []

  const metaRow = (label: string, value: string) => (
    <View key={label} style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  )

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.headerBack}>
          <MaterialCommunityIcons color={colors.text} name="arrow-left" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Screening Details</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.statusState}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : isError ? (
          <Text style={styles.statusText}>
            We couldn&apos;t load this screening. Please try again.
          </Text>
        ) : !screening ? (
          <Text style={styles.statusText}>
            This screening log is no longer available. Scan your pet&apos;s skin to start a new
            screening.
          </Text>
        ) : (
          <>
            <View style={styles.card}>
              {screening.image?.url ? (
                <Image source={{ uri: screening.image.url }} style={styles.imageFull} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <MaterialCommunityIcons color={colors.textMuted} name="paw" size={28} />
                </View>
              )}

              <View style={styles.titleRow}>
                <Text numberOfLines={1} style={styles.petName}>{screening.pet_name}</Text>
                {screening.is_booked ? (
                  <View style={[styles.statusPill, { backgroundColor: BOOKED_PILL.bg }]}>
                    <Text style={[styles.statusPillText, { color: BOOKED_PILL.fg }]}>
                      {BOOKED_PILL.label}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.sectionLabel}>PREDICTED CONDITION</Text>
              <Text style={[styles.disease, { color: diseaseColor }]}>{screening.disease}</Text>
              <View style={styles.confidenceRow}>
                <Text style={[styles.confidenceValue, { color: diseaseColor }]}>
                  {Math.round(Number(screening.ais_confidence))}%
                </Text>
                <Text style={styles.confidenceLabel}>model confidence</Text>
              </View>

              {metaRow('Scanned', formatDateTime(screening.ais_created_at))}
              {metaRow('Model', screening.ais_model_version)}
              {screening.ais_inference_time_ms !== null
                ? metaRow('Inference', `${screening.ais_inference_time_ms} ms`)
                : null}
              {screening.ais_device ? metaRow('Device', screening.ais_device) : null}
              {metaRow('Source', 'On-device screening')}
            </View>

            <CareGuidelinesCard prediction={screening.disease_code} />

            <SymptomSummaryCard
              rows={symptomRows}
              answeredCount={symptomRows.length}
              totalQuestions={KNOWLEDGE.questions.length}
            />

            <View style={styles.infoCard}>
              <MaterialCommunityIcons
                color={colors.textMuted}
                name="information-outline"
                size={16}
              />
              <Text style={styles.infoText}>
                AI-assisted screening does not replace professional veterinary diagnosis. The
                on-device prediction is the primary result and is never merged with any other
                output into one probability. Care guidelines are general veterinarian-approved
                guidance, not a prescription. Consult a veterinarian for definitive results.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: { backgroundColor: colors.surface, flex: 1 },
  content: { gap: 4, paddingBottom: 24, paddingHorizontal: 20, paddingTop: 10 },
  statusState: { alignItems: 'center', justifyContent: 'center', minHeight: 160 },
  statusText: { ...font.regular, color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },

  header: { height: 50, marginHorizontal: 10, marginBottom: 8, marginTop: -10 },
  headerBack: {
    alignItems: 'center',
    height: 50,
    justifyContent: 'center',
    marginTop: 20,
    width: 50,
  },
  headerTitle: { ...font.extrabold, color: colors.text, fontSize: 20, marginLeft: 50, marginTop: -40 },
  headerRight: { width: 20 },

  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    marginBottom: 16,
    padding: 16,
  },
  imageFull: { borderRadius: 12, height: 200, width: '100%' },
  imagePlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    height: 120,
    justifyContent: 'center',
    width: '100%',
  },
  titleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  petName: { ...font.bold, color: colors.text, flex: 1, fontSize: 16, marginRight: 10 },
  statusPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { ...font.bold, fontSize: 11 },

  sectionLabel: {
    ...font.bold,
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.6,
    marginBottom: 4,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  disease: { ...font.extrabold, fontSize: 22 },
  confidenceRow: { alignItems: 'baseline', flexDirection: 'row', gap: 8, marginBottom: 6 },
  confidenceValue: { ...font.extrabold, fontSize: 20 },
  confidenceLabel: { ...font.regular, color: colors.textSecondary, fontSize: 13 },

  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  metaLabel: { ...font.regular, color: colors.textSecondary, fontSize: 13 },
  metaValue: {
    ...font.semibold,
    color: colors.text,
    flexShrink: 1,
    fontSize: 13,
    marginLeft: 12,
    textAlign: 'right',
  },

  infoCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    padding: 12,
  },
  infoText: { ...font.regular, color: colors.textSecondary, flex: 1, fontSize: 12, lineHeight: 17 },
})
