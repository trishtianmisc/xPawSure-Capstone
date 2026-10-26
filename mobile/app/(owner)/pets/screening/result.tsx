import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState, type ComponentProps } from 'react'
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useTheme, type AppColors } from '../../../../src/context/ThemeContext'
import { font } from '../../../../src/theme/typography'
import type { Prediction, ScreeningResultState } from '../../../../ai/types/ai.types'
import { SCREENING_STATE_MESSAGES } from '../../../../ai/constants/diseases'
import { ClaudeReviewCard } from '../../../../features/screening/components/AnalysisCards'
import { useCreateScreening } from '../../../../features/screening/hooks/useCreateScreening'
import type {
  ClaudeAnalysisResponse,
  ClaudeImageSuitability,
} from '../../../../features/screening/types'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

const DISEASE_META: Record<string, { color: string; icon: IconName }> = {
  ALLERGIC_DERMATITIS: { color: '#E67E22', icon: 'alert-circle-outline' },
  BACTERIAL: { color: '#C0392B', icon: 'bacteria-outline' },
  FUNGAL: { color: '#8E44AD', icon: 'flower-tulip-outline' },
  HOTSPOT: { color: '#D35400', icon: 'fire' },
  MANGE: { color: '#27AE60', icon: 'bug-outline' },
}

const STATE_META: Record<ScreeningResultState, { color: string; icon: IconName }> = {
  DISEASE_DETECTED: { color: '#C0392B', icon: 'medical-bag' },
  NOT_SKIN_IMAGE: { color: '#E67E22', icon: 'image-off-outline' },
  UNCERTAIN: { color: '#F39C12', icon: 'help-circle-outline' },
  INVALID_IMAGE: { color: '#E74C3C', icon: 'image-off-outline' },
}

const GATE_META: Record<
  ClaudeImageSuitability,
  { color: string; icon: IconName; title: string }
> = {
  SUITABLE: {
    color: '#27AE60',
    icon: 'check-circle-outline',
    title: 'Image approved for screening',
  },
  POOR_QUALITY: {
    color: '#E67E22',
    icon: 'image-off-outline',
    title: 'Photo Not Clear Enough',
  },
  NOT_DOG_SKIN: {
    color: '#E67E22',
    icon: 'image-off-outline',
    title: 'Not a Skin Image',
  },
  NO_VISIBLE_LESIONS: {
    color: '#27AE60',
    icon: 'check-circle-outline',
    title: 'Skin Appears Healthy',
  },
  WOUND_OR_INJURY: {
    color: '#C0392B',
    icon: 'medical-bag',
    title: 'Possible Wound or Injury',
  },
  UNCERTAIN: {
    color: '#F39C12',
    icon: 'help-circle-outline',
    title: 'Unable to Assess',
  },
}

const RESULT_STATES = Object.keys(SCREENING_STATE_MESSAGES) as ScreeningResultState[]

const QUESTIONNAIRE_COLOR = '#8E44AD'

function parseClaude(value?: string): ClaudeAnalysisResponse | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as Partial<ClaudeAnalysisResponse> | null
    if (!parsed || typeof parsed !== 'object' || typeof parsed.status !== 'string') {
      return null
    }
    return parsed as ClaudeAnalysisResponse
  } catch {
    return null
  }
}

function ConfidenceBar({ label, confidence, isTop, color }: {
  label: string
  confidence: number
  isTop: boolean
  color: string
}) {
  const { colors } = useTheme()
  const pct = Math.round(confidence)

  return (
    <View style={barStyles.row}>
      <View style={barStyles.labelRow}>
        <Text style={[barStyles.label, isTop && { color: colors.text }]} numberOfLines={1}>
          {isTop ? '★ ' : '  '}{label}
        </Text>
        <Text style={[barStyles.pct, isTop && { ...font.bold, color: colors.text }]}>{pct}%</Text>
      </View>
      <View style={[barStyles.track, { backgroundColor: colors.surfaceAlt }]}>
        <View
          style={[
            barStyles.fill,
            {
              backgroundColor: isTop ? color : colors.border,
              width: `${pct}%`,
            },
          ]}
        />
      </View>
    </View>
  )
}

const barStyles = StyleSheet.create({
  row: { gap: 6, marginBottom: 14 },
  labelRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  label: { ...font.medium, color: '#A0A0A0', flex: 1, fontSize: 13 },
  pct: { ...font.semibold, color: '#A0A0A0', fontSize: 13, marginLeft: 8, minWidth: 36, textAlign: 'right' },
  track: { borderRadius: 4, height: 8, overflow: 'hidden', width: '100%' },
  fill: { borderRadius: 4, height: '100%' },
})

export default function ResultScreen() {
  const router = useRouter()
  const { colors, isDark } = useTheme()
  const createScreening = useCreateScreening()
  const [saveError, setSaveError] = useState(false)
  const params = useLocalSearchParams<{
    imageUri?: string
    petId?: string
    petName?: string
    predictions?: string
    modelVersion?: string
    inferenceTimeMs?: string
    state?: string
    stateMessage?: string
    deviceFailed?: string
    classifierSkipped?: string
    claude?: string
    claudeRequestFailed?: string
    refined?: string
    questionnaireOnly?: string
    changed?: string
    refinementMethod?: string
    stoppingReason?: string
    answeredCount?: string
    totalQuestions?: string
    alreadySaved?: string
  }>()
  const styles = useMemo(() => createStyles(colors), [colors])

  const deviceFailed = params.deviceFailed === 'true'
  const classifierSkipped = params.classifierSkipped === 'true'
  const claudeRequestFailed = params.claudeRequestFailed === 'true'

  const screeningState: ScreeningResultState | null = deviceFailed || classifierSkipped
    ? null
    : RESULT_STATES.includes(params.state as ScreeningResultState)
      ? (params.state as ScreeningResultState)
      : 'DISEASE_DETECTED'

  const predictions: Prediction[] = useMemo(() => {
    try {
      const parsed = JSON.parse(params.predictions || '[]')
      return Array.isArray(parsed) ? (parsed as Prediction[]) : []
    } catch {
      return []
    }
  }, [params.predictions])

  const refinedPredictions: Prediction[] = useMemo(() => {
    try {
      const parsed = JSON.parse(params.refined || '[]')
      return Array.isArray(parsed) ? (parsed as Prediction[]) : []
    } catch {
      return []
    }
  }, [params.refined])

  const sortedRefined = useMemo(
    () => [...refinedPredictions].sort((a, b) => b.confidence - a.confidence),
    [refinedPredictions],
  )
  const refinedTop = sortedRefined[0] ?? null
  const refinedTopMeta = refinedTop
    ? DISEASE_META[refinedTop.disease] ?? { color: colors.primary, icon: 'help-circle-outline' as IconName }
    : null

  const questionnaireOnlyPredictions: Prediction[] = useMemo(() => {
    try {
      const parsed = JSON.parse(params.questionnaireOnly || '[]')
      return Array.isArray(parsed) ? (parsed as Prediction[]) : []
    } catch {
      return []
    }
  }, [params.questionnaireOnly])

  const sortedQuestionnaireOnly = useMemo(
    () => [...questionnaireOnlyPredictions].sort((a, b) => b.confidence - a.confidence),
    [questionnaireOnlyPredictions],
  )
  const questionnaireOnlyTop = sortedQuestionnaireOnly[0] ?? null
  const questionnaireOnlyTopMeta = questionnaireOnlyTop
    ? DISEASE_META[questionnaireOnlyTop.disease] ?? { color: colors.primary, icon: 'help-circle-outline' as IconName }
    : null

  const answeredCount = Number(params.answeredCount) || 0
  const totalQuestions = Number(params.totalQuestions) || 0
  const alreadySaved = params.alreadySaved === 'true'
  // Tracks whether this result is already on the server, whether it arrived
  // pre-saved from the questionnaire step or was saved from this screen.
  const [saved, setSaved] = useState(alreadySaved)
  // Id of the screening created from this screen; the booking wizard needs it.
  const [savedId, setSavedId] = useState<string | null>(null)

  const claudeResponse = useMemo(() => parseClaude(params.claude), [params.claude])
  const gateFindings = classifierSkipped ? claudeResponse?.result ?? null : null
  const gateMeta = gateFindings ? GATE_META[gateFindings.image_suitability] : null
  const sorted = useMemo(
    () => [...predictions].sort((a, b) => b.confidence - a.confidence),
    [predictions],
  )
  const top = sorted[0] ?? null
  const topMeta = top
    ? DISEASE_META[top.disease] ?? { color: colors.primary, icon: 'help-circle-outline' }
    : null
  const stateMeta = screeningState ? STATE_META[screeningState] : null
  const stateConfig = screeningState ? SCREENING_STATE_MESSAGES[screeningState] : null

  const hasValidPet = !!params.petId && params.petId !== 'unknown'
  const canBook =
    !deviceFailed &&
    !classifierSkipped &&
    screeningState === 'DISEASE_DETECTED' &&
    !!top &&
    hasValidPet &&
    !!params.imageUri &&
    !!claudeResponse?.token

  /**
   * Persist this screening. `onSaved` runs only after the server confirms and
   * receives the created screening id, so callers can chain navigation without
   * ever saving silently twice.
   */
  const saveScreening = (onSaved: (savedSid: string) => void) => {
    if (!canBook || !params.petId || createScreening.isPending) return
    if (saved) {
      if (savedId) onSaved(savedId)
      return
    }
    const bookingTop = refinedTop ?? top
    if (!bookingTop) return
    setSaveError(false)
    createScreening.mutate(
      {
        pet_id: params.petId,
        source: 'DEVICE',
        prediction: bookingTop.disease,
        confidence: Math.round(bookingTop.confidence),
        model_version: params.modelVersion || 'unknown',
        inference_time_ms: Number(params.inferenceTimeMs) || undefined,
        device: Platform.OS,
        image_uri: params.imageUri,
        claude_token: claudeResponse?.token || undefined,
      },
      {
        onSuccess: (created) => {
          setSaved(true)
          setSavedId(created.ais_id)
          onSaved(created.ais_id)
        },
        onError: () => {
          setSaveError(true)
        },
      },
    )
  }

  /** Save only: the owner keeps the result on screen with a saved confirmation. */
  const handleSave = () => {
    saveScreening(() => {})
  }

  /** Save when needed, then open the booking wizard with the scan attached. */
  const handleBookAppointment = () => {
    saveScreening((savedSid) => {
      router.replace({
        pathname: '/(owner)/appointments/book',
        params: { petId: params.petId, screeningId: savedSid },
      })
    })
  }

  const scanAgain = () => {
    router.replace({
      pathname: '/(owner)/pets/screening',
      params: { petId: params.petId, petName: params.petName },
    })
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={styles.safeArea.backgroundColor} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBack}>
          <MaterialCommunityIcons color={colors.text} name="arrow-left" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Screening Result</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.imageRow}>
          {params.imageUri ? (
            <Image source={{ uri: params.imageUri }} style={styles.thumbnail} />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <MaterialCommunityIcons color={colors.primary} name="paw" size={24} />
            </View>
          )}
          <View style={styles.imageInfo}>
            <Text style={styles.petName}>{params.petName || 'Your pet'}</Text>
            <Text style={styles.timestamp}>
              {classifierSkipped
                ? 'One photo · image validation only'
                : deviceFailed
                  ? 'One photo · image validation, classifier unavailable'
                  : 'One photo · image validation and on-device model'}
            </Text>
          </View>
        </View>

        {classifierSkipped && gateFindings && gateMeta && (
          <>
            <Text style={styles.sectionLabel}>IMAGE VALIDATION</Text>
            <View style={[styles.stateCard, { borderColor: gateMeta.color + '40' }]}>
              <View style={[styles.stateIconCircle, { backgroundColor: gateMeta.color + '18' }]}>
                <MaterialCommunityIcons color={gateMeta.color} name={gateMeta.icon} size={32} />
              </View>
              <Text style={[styles.stateTitle, { color: gateMeta.color }]}>{gateMeta.title}</Text>
              <Text style={styles.stateMessage}>{gateFindings.screening_message}</Text>
              <Text style={styles.gateNote}>
                No on-device disease prediction was produced for this photo.
              </Text>
            </View>
          </>
        )}

        {classifierSkipped && !gateFindings && (
          <>
            <Text style={styles.sectionLabel}>IMAGE VALIDATION</Text>
            <View style={[styles.stateCard, { borderColor: colors.error + '40' }]}>
              <View style={[styles.stateIconCircle, { backgroundColor: colors.errorBg }]}>
                <MaterialCommunityIcons color={colors.error} name="alert-circle-outline" size={32} />
              </View>
              <Text style={[styles.stateTitle, { color: colors.error }]}>
                Image validation unavailable
              </Text>
              <Text style={styles.stateMessage}>
                No on-device disease prediction was produced. Please try another photo.
              </Text>
            </View>
          </>
        )}

        {!classifierSkipped && <Text style={styles.sectionLabel}>ON-DEVICE RESULT</Text>}

        {!classifierSkipped && deviceFailed && (
          <View style={[styles.stateCard, { borderColor: colors.error + '40' }]}>
            <View style={[styles.stateIconCircle, { backgroundColor: colors.errorBg }]}>
              <MaterialCommunityIcons color={colors.error} name="cellphone-off" size={32} />
            </View>
            <Text style={[styles.stateTitle, { color: colors.error }]}>
              On-device analysis unavailable
            </Text>
            <Text style={styles.stateMessage}>
              No prediction was produced, so none is shown. The image review below is
              displayed on its own and is not a diagnosis.
            </Text>
          </View>
        )}

        {!deviceFailed && screeningState === 'DISEASE_DETECTED' && top && topMeta && (
          <>
            <View style={[styles.topCard, { borderColor: topMeta.color + '30' }]}>
              <View style={[styles.topIconCircle, { backgroundColor: topMeta.color + '18' }]}>
                <MaterialCommunityIcons color={topMeta.color} name={topMeta.icon} size={28} />
              </View>
              <Text style={styles.topLabel}>Predicted Condition</Text>
              <Text style={[styles.topDisease, { color: topMeta.color }]}>{top.label}</Text>
              <View style={styles.confidenceBadge}>
                <Text style={[styles.confidenceText, { color: topMeta.color }]}>
                  {Math.round(top.confidence)}%
                </Text>
                <Text style={styles.confidenceLabel}>model confidence</Text>
              </View>
              <Text style={styles.comparisonText}>
                Raw output from the on-device model. It is not a diagnosis.
              </Text>
            </View>

            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>All Predictions</Text>
              {sorted.map((pred, i) => {
                const meta = DISEASE_META[pred.disease] ?? { color: colors.primary }
                return (
                  <ConfidenceBar
                    key={pred.disease}
                    label={pred.label}
                    confidence={pred.confidence}
                    isTop={i === 0}
                    color={meta.color}
                  />
                )
              })}
            </View>
          </>
        )}

        {!deviceFailed && screeningState === 'DISEASE_DETECTED' && questionnaireOnlyTop && questionnaireOnlyTopMeta && (
          <>
            <Text style={styles.sectionLabel}>QUESTIONNAIRE-ONLY RESULT</Text>
            <View style={[styles.topCard, { borderColor: QUESTIONNAIRE_COLOR + '40' }]}>
              <View style={[styles.topIconCircle, { backgroundColor: QUESTIONNAIRE_COLOR + '18' }]}>
                <MaterialCommunityIcons color={QUESTIONNAIRE_COLOR} name="clipboard-text-outline" size={28} />
              </View>
              <Text style={styles.topLabel}>Answer-Only Suggestion</Text>
              <Text style={[styles.topDisease, { color: QUESTIONNAIRE_COLOR }]}>
                {questionnaireOnlyTop.label}
              </Text>
              <View style={styles.confidenceBadge}>
                <Text style={[styles.confidenceText, { color: QUESTIONNAIRE_COLOR }]}>
                  {Math.round(questionnaireOnlyTop.confidence)}%
                </Text>
                <Text style={styles.confidenceLabel}>uncalibrated answer score</Text>
              </View>
              <Text style={styles.comparisonText}>
                Uses only your {answeredCount} of {totalQuestions} answers, starting from an even
                assumption. Independent of the photo screening. Preliminary and not clinically
                calibrated.
              </Text>
            </View>

            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>Answer-Only Predictions</Text>
              {sortedQuestionnaireOnly.map((pred, i) => {
                const meta = DISEASE_META[pred.disease] ?? { color: colors.primary }
                return (
                  <ConfidenceBar
                    key={pred.disease}
                    label={pred.label}
                    confidence={pred.confidence}
                    isTop={i === 0}
                    color={meta.color}
                  />
                )
              })}
            </View>
          </>
        )}

        {!deviceFailed && screeningState === 'DISEASE_DETECTED' && !questionnaireOnlyTop && answeredCount > 0 && (
          <View style={[styles.infoCard, { backgroundColor: colors.surfaceAlt, marginBottom: 16 }]}>
            <MaterialCommunityIcons color={colors.textMuted} name="information-outline" size={16} />
            <Text style={styles.infoText}>
              No separate questionnaire-only result is available. Your answers did not contain
              enough distinguishing information on their own.
            </Text>
          </View>
        )}

        {!deviceFailed && screeningState === 'DISEASE_DETECTED' && refinedTop && refinedTopMeta && (
          <>
            <Text style={styles.sectionLabel}>COMBINED MODEL + QUESTIONNAIRE</Text>
            <View style={[styles.topCard, { borderColor: refinedTopMeta.color + '30' }]}>
              <View style={[styles.topIconCircle, { backgroundColor: refinedTopMeta.color + '18' }]}>
                <MaterialCommunityIcons color={refinedTopMeta.color} name={refinedTopMeta.icon} size={28} />
              </View>
              <Text style={styles.topLabel}>Combined Screening Suggestion</Text>
              <Text style={[styles.topDisease, { color: refinedTopMeta.color }]}>{refinedTop.label}</Text>
              <View style={styles.confidenceBadge}>
                <Text style={[styles.confidenceText, { color: refinedTopMeta.color }]}>
                  {Math.round(refinedTop.confidence)}%
                </Text>
                <Text style={styles.confidenceLabel}>combined screening score</Text>
              </View>
              <Text style={styles.comparisonText}>
                Combines the on-device screening with {answeredCount} of {totalQuestions} questionnaire answers.
                {params.changed === 'true'
                  ? ' Your answers changed the leading suggestion.'
                  : ' Your answers did not change the leading suggestion.'}
                {' '}Provisional and not clinically calibrated.
              </Text>
            </View>

            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>Adjusted Predictions</Text>
              {sortedRefined.map((pred, i) => {
                const meta = DISEASE_META[pred.disease] ?? { color: colors.primary }
                return (
                  <ConfidenceBar
                    key={pred.disease}
                    label={pred.label}
                    confidence={pred.confidence}
                    isTop={i === 0}
                    color={meta.color}
                  />
                )
              })}
            </View>
          </>
        )}

        {!deviceFailed && screeningState !== 'DISEASE_DETECTED' && stateMeta && stateConfig && (
          <View style={[styles.stateCard, { borderColor: stateMeta.color + '30' }]}>
            <View style={[styles.stateIconCircle, { backgroundColor: stateMeta.color + '18' }]}>
              <MaterialCommunityIcons color={stateMeta.color} name={stateMeta.icon} size={32} />
            </View>
            <Text style={[styles.stateTitle, { color: stateMeta.color }]}>{stateConfig.title}</Text>
            <Text style={styles.stateMessage}>
              {params.stateMessage || stateConfig.message}
            </Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>INDEPENDENT REVIEW</Text>
        <ClaudeReviewCard response={claudeResponse} requestFailed={claudeRequestFailed} />

        <View style={[styles.infoCard, { backgroundColor: colors.surfaceAlt }]}>
          <MaterialCommunityIcons color={colors.textMuted} name="information-outline" size={16} />
          <Text style={styles.infoText}>
            {classifierSkipped || deviceFailed
              ? 'The image review was used to decide whether on-device screening was appropriate. It is not a diagnosis. Consult a vet for definitive results.'
              : refinedTop
                ? 'AI-assisted screening does not replace professional veterinary diagnosis. The photo-only, questionnaire-only, and combined views are independent; the questionnaire-only and combined scores are provisional. Consult a vet for definitive results.'
                : 'AI-assisted screening does not replace professional veterinary diagnosis. The two analyses are independent and are never merged into one probability. Consult a vet for definitive results.'}
          </Text>
        </View>

        {canBook && (
          <Pressable
            accessibilityLabel="Save this screening result"
            disabled={saved || createScreening.isPending}
            onPress={handleSave}
            style={[
              styles.actionBtn,
              styles.primaryBtn,
              (saved || createScreening.isPending) && styles.actionBtnDisabled,
            ]}
          >
            {createScreening.isPending ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <MaterialCommunityIcons
                color="#FFF"
                name={saved ? 'check-circle-outline' : 'content-save-outline'}
                size={16}
              />
            )}
            <Text style={[styles.actionBtnText, { color: '#FFF' }]}>
              {createScreening.isPending ? 'Saving...' : saved ? 'Saved' : 'Save Result'}
            </Text>
          </Pressable>
        )}

        {canBook && saved && (
          <View style={styles.savedRow}>
            <MaterialCommunityIcons color="#27AE60" name="check-circle" size={16} />
            <Text style={styles.savedText}>
              Saved to your pet&apos;s records. You can book now or later.
            </Text>
          </View>
        )}

        {canBook && (
          <Pressable
            accessibilityLabel="Book an appointment"
            disabled={createScreening.isPending}
            onPress={handleBookAppointment}
            style={[
              styles.actionBtn,
              styles.secondaryBtn,
              styles.bookBtn,
              { borderColor: colors.border },
              createScreening.isPending && styles.actionBtnDisabled,
            ]}
          >
            <MaterialCommunityIcons color={colors.primary} name="calendar-plus" size={16} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>
              Book an Appointment
            </Text>
          </Pressable>
        )}

        {saveError && (
          <View style={styles.saveErrorRow}>
            <MaterialCommunityIcons color={colors.error} name="alert-circle-outline" size={16} />
            <Text style={[styles.saveErrorText, { color: colors.error }]}>
              Couldn&apos;t save the screening. Check your connection and try again.
            </Text>
          </View>
        )}

        <Pressable
          onPress={scanAgain}
          style={[styles.actionBtn, styles.secondaryBtn, styles.scanAgainBtn, { borderColor: colors.border }]}
        >
          <MaterialCommunityIcons color={colors.primary} name="camera" size={16} />
          <Text style={[styles.actionBtnText, { color: colors.primary }]}>
            {classifierSkipped ? 'Choose Another Photo' : 'Scan Again'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  headerBack: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitle: { ...font.extrabold, color: colors.text, flex: 1, fontSize: 20 },
  headerRight: { width: 40 },

  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 },

  sectionLabel: {
    ...font.bold,
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
    textTransform: 'uppercase',
  },

  imageRow: { alignItems: 'center', flexDirection: 'row', gap: 14, marginBottom: 20 },
  thumbnail: { borderRadius: 14, height: 56, width: 56 },
  thumbnailPlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  imageInfo: { flex: 1 },
  petName: { ...font.bold, color: colors.text, fontSize: 16 },
  timestamp: { ...font.regular, color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 2 },

  topCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
  },
  topIconCircle: {
    alignItems: 'center',
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    marginBottom: 12,
    width: 64,
  },
  topLabel: { ...font.semibold, color: colors.textMuted, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  topDisease: { ...font.extrabold, fontSize: 22, marginTop: 6 },
  confidenceBadge: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 10 },
  confidenceText: { ...font.extrabold, fontSize: 32 },
  confidenceLabel: { ...font.medium, color: colors.textMuted, fontSize: 13 },

  breakdownCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    padding: 18,
  },
  breakdownTitle: { ...font.bold, color: colors.text, fontSize: 15, marginBottom: 16 },
  comparisonText: {
    color: colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 17,
    marginTop: 10,
    textAlign: 'center',
  },

  stateCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 28,
  },
  stateIconCircle: {
    alignItems: 'center',
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    marginBottom: 16,
    width: 80,
  },
  stateTitle: { ...font.extrabold, fontSize: 20, textAlign: 'center' },
  stateMessage: {
    ...font.regular,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    textAlign: 'center',
  },
  gateNote: {
    ...font.semibold,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
    textAlign: 'center',
  },

  infoCard: {
    alignItems: 'flex-start',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoText: { ...font.regular, color: colors.textMuted, flex: 1, fontSize: 12, lineHeight: 17 },

  actionBtn: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 14,
    width: '100%',
  },
  actionBtnDisabled: { opacity: 0.6 },
  primaryBtn: { backgroundColor: '#B96534', marginTop: 16 },
  secondaryBtn: { backgroundColor: colors.surface, borderWidth: 1.5 },
  bookBtn: { marginTop: 12 },
  scanAgainBtn: { marginTop: 12 },
  actionBtnText: { ...font.bold, fontSize: 14 },

  savedRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: '#27AE60',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  savedText: { ...font.semibold, color: colors.textSecondary, flex: 1, fontSize: 12, lineHeight: 17 },

  saveErrorRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.error,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  saveErrorText: { ...font.semibold, flex: 1, fontSize: 12, lineHeight: 17 },
})
