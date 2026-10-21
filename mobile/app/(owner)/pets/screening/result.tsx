import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { useTheme, type AppColors } from '../../../../src/context/ThemeContext'
import { font } from '../../../../src/theme/typography'
import type { ImageReport, Prediction, ScreeningResultState } from '../../../../ai/types/ai.types'
import { SCREENING_STATE_MESSAGES } from '../../../../ai/constants/diseases'
import { countRejectedReports } from '../../../../ai/services/screening.logic'
import { usePet } from '../../../../features/pet/hooks/usePet'
import { useCreateScreening } from '../../../../features/screening/hooks/useCreateScreening'

const DISEASE_META: Record<string, { color: string; icon: string }> = {
  ALLERGIC_DERMATITIS: { color: '#E67E22', icon: 'alert-circle-outline' },
  BACTERIAL: { color: '#C0392B', icon: 'bacteria-outline' },
  FUNGAL: { color: '#8E44AD', icon: 'flower-tulip-outline' },
  HOTSPOT: { color: '#D35400', icon: 'fire' },
  MANGE: { color: '#27AE60', icon: 'bug-outline' },
}

const STATE_META: Record<ScreeningResultState, { color: string; icon: string }> = {
  DISEASE_DETECTED: { color: '#C0392B', icon: 'medical-bag' },
  NOT_SKIN_IMAGE: { color: '#E67E22', icon: 'image-off-outline' },
  UNCERTAIN: { color: '#F39C12', icon: 'help-circle-outline' },
  INVALID_IMAGE: { color: '#E74C3C', icon: 'image-off-outline' },
}

function buildStoppingNotice(
  reason: string | undefined,
  answeredCount: number,
  totalQuestions: number,
): string | null {
  if (reason === 'criteria-met') {
    if (answeredCount >= totalQuestions) {
      return `All ${totalQuestions} questions were answered and the configured provisional criteria were met. This is not a diagnosis.`
    }
    return `Questionnaire stopped early after ${answeredCount} of ${totalQuestions} answers because the configured provisional criteria were met. This is not a diagnosis.`
  }
  if (reason === 'all-questions-answered') {
    return `All ${totalQuestions} questions were answered without meeting the early-stop criteria. Showing the best available preliminary result; uncertainty remains.`
  }
  if (reason === 'completed-with-early-stopping-disabled') {
    return `All ${totalQuestions} questions completed. Showing the best available preliminary result.`
  }
  return null
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
    imageUri: string
    petId: string
    petName: string
    predictions: string
    modelVersion: string
    inferenceTimeMs: string
    state: ScreeningResultState
    stateMessage: string
    alreadySaved: string
    refined?: string
    changed?: string
    refinementMethod?: string
    stoppingReason?: string
    answeredCount?: string
    totalQuestions?: string
    imageReports?: string
  }>()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { data: pet } = usePet(
    params.petId && params.petId !== 'unknown' ? params.petId : undefined,
  )

  const screeningState = (params.state as ScreeningResultState) || 'INVALID_IMAGE'
  const stateMessage = params.stateMessage || ''

  const predictions: Prediction[] = useMemo(() => {
    try {
      return JSON.parse(params.predictions || '[]')
    } catch {
      return []
    }
  }, [params.predictions])

  const refinedPredictions: Prediction[] | null = useMemo(() => {
    try {
      const parsed = params.refined ? JSON.parse(params.refined) : null
      return Array.isArray(parsed) && parsed.length > 0 ? (parsed as Prediction[]) : null
    } catch {
      return null
    }
  }, [params.refined])

  const imageReports: ImageReport[] = useMemo(() => {
    try {
      const parsed = params.imageReports ? JSON.parse(params.imageReports) : null
      return Array.isArray(parsed) ? (parsed as ImageReport[]) : []
    } catch {
      return []
    }
  }, [params.imageReports])

  const rejectionMessages = useMemo(() => {
    const counts = countRejectedReports(imageReports)
    const messages: string[] = []
    const notSkin = counts.notSkin + counts.lowSimilarity

    if (screeningState !== 'INVALID_IMAGE' && notSkin > 0) {
      messages.push(`${notSkin} ${notSkin === 1 ? 'photo' : 'photos'} did not look like dog skin.`)
    }
    if (counts.quality > 0) {
      messages.push(`${counts.quality} ${counts.quality === 1 ? 'photo was' : 'photos were'} too dark or blurry.`)
    }

    return messages
  }, [imageReports, screeningState])

  const sorted = useMemo(() => [...predictions].sort((a, b) => b.confidence - a.confidence), [predictions])
  const top = sorted[0]
  const finalTop = refinedPredictions ? refinedPredictions[0] : top
  const isChanged = params.changed === 'true'
  const isBayesian = params.refinementMethod === 'bayesian-provisional-v1'
  const answeredCount = Number(params.answeredCount) || 0
  const totalQuestions = Number(params.totalQuestions) || 12
  const stoppingNotice = isBayesian
    ? buildStoppingNotice(params.stoppingReason, answeredCount, totalQuestions)
    : null
  const topMeta = finalTop ? DISEASE_META[finalTop.disease] ?? { color: colors.primary, icon: 'help-circle-outline' } : null
  const confidencePct = finalTop ? Math.round(finalTop.confidence) : 0
  const displayBars = refinedPredictions ? refinedPredictions.slice(0, 3) : sorted

  const stateMeta = STATE_META[screeningState]
  const stateConfig = SCREENING_STATE_MESSAGES[screeningState]

  const canBook = screeningState === 'DISEASE_DETECTED' && !!finalTop && !!params.petId && params.petId !== 'unknown'

  const handleSaveAndBook = () => {
    if (!canBook || !finalTop || createScreening.isPending) return
    if (params.alreadySaved === 'true') {
      router.replace('/(owner)/appointments/book')
      return
    }
    setSaveError(false)
    createScreening.mutate(
      {
        pet_id: params.petId,
        source: 'DEVICE',
        prediction: finalTop.disease,
        confidence: Math.round(finalTop.confidence),
        model_version: params.modelVersion || 'unknown',
        inference_time_ms: Number(params.inferenceTimeMs) || undefined,
        device: Platform.OS,
      },
      {
        onSuccess: () => {
          router.replace('/(owner)/appointments/book')
        },
        onError: () => {
          setSaveError(true)
        },
      },
    )
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
          {pet?.profile_picture ? (
            <Image source={{ uri: pet.profile_picture }} style={styles.thumbnail} />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <MaterialCommunityIcons color={colors.primary} name="paw" size={24} />
            </View>
          )}
          <View style={styles.imageInfo}>
            <Text style={styles.petName}>{params.petName}</Text>
            <Text style={styles.timestamp}>
              {imageReports.length > 0
                ? `${imageReports.filter((r) => r.status === 'ok').length}/${imageReports.length} photos used`
                : 'Just now'}
            </Text>
          </View>
        </View>

        {imageReports.length > 0 && (
          <View style={styles.reportStrip}>
            {imageReports.map((report, i) => (
              <View key={`${report.uri}-${i}`} style={styles.reportItem}>
                <Image source={{ uri: report.uri }} style={[styles.reportThumb, report.status !== 'ok' && styles.reportThumbFailed]} />
                <View style={[styles.reportBadge, report.status === 'ok' ? styles.reportBadgeOk : styles.reportBadgeFail]}>
                  <MaterialCommunityIcons
                    color="#FFF"
                    name={report.status === 'ok' ? 'check' : 'close'}
                    size={10}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {rejectionMessages.length > 0 && (
          <View style={styles.rejectionNote}>
            <MaterialCommunityIcons color={colors.textMuted} name="information-outline" size={14} />
            <Text style={styles.rejectionText}>{rejectionMessages.join(' ')}</Text>
          </View>
        )}

        {stoppingNotice && (
          <View style={[styles.stoppingNote, { backgroundColor: colors.surfaceAlt }]}>
            <MaterialCommunityIcons color={colors.textMuted} name="information-outline" size={16} />
            <Text style={styles.stoppingText}>{stoppingNotice}</Text>
          </View>
        )}

        {screeningState === 'DISEASE_DETECTED' && finalTop && topMeta && (
          <>
            <View style={[styles.topCard, { borderColor: topMeta.color + '30' }]}>
              <View style={[styles.topIconCircle, { backgroundColor: topMeta.color + '18' }]}>
                <MaterialCommunityIcons color={topMeta.color} name={topMeta.icon as any} size={28} />
              </View>
              <Text style={styles.topLabel}>
                {isBayesian
                  ? 'Bayesian Screening Suggestion'
                  : refinedPredictions
                    ? 'Closest Match'
                    : 'Predicted Condition'}
              </Text>
              <Text style={[styles.topDisease, { color: topMeta.color }]}>{finalTop.label}</Text>
              <View style={styles.confidenceBadge}>
                <Text style={[styles.confidenceText, { color: topMeta.color }]}>{confidencePct}%</Text>
                <Text style={styles.confidenceLabel}>
                  {isBayesian ? 'screening likelihood' : 'confidence'}
                </Text>
              </View>
              {refinedPredictions && (
                <Text style={styles.comparisonText}>
                  {isChanged
                    ? `Your answers shifted the result from the preliminary screen\u2019s ${top?.label}.`
                    : 'Consistent with the preliminary AI screen.'}
                </Text>
              )}
            </View>

            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>
                {isBayesian
                  ? 'Top 3 Screening Likelihoods'
                  : refinedPredictions
                    ? 'Top 3 Suggestions'
                    : 'All Predictions'}
              </Text>
              {displayBars.map((pred, i) => {
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
              {refinedPredictions && (
                <Text style={styles.moreCountText}>
                  2 other conditions were also considered and scored lower.
                </Text>
              )}
            </View>
          </>
        )}

        {(screeningState === 'NOT_SKIN_IMAGE' || screeningState === 'UNCERTAIN' || screeningState === 'INVALID_IMAGE') && (
          <View style={[styles.stateCard, { borderColor: stateMeta.color + '30' }]}>
            <View style={[styles.stateIconCircle, { backgroundColor: stateMeta.color + '18' }]}>
              <MaterialCommunityIcons color={stateMeta.color} name={stateMeta.icon as any} size={32} />
            </View>
            <Text style={[styles.stateTitle, { color: stateMeta.color }]}>{stateConfig.title}</Text>
            <Text style={styles.stateMessage}>{stateMessage || stateConfig.message}</Text>
          </View>
        )}

        <View style={[styles.infoCard, { backgroundColor: colors.surfaceAlt }]}>
          <MaterialCommunityIcons color={colors.textMuted} name="information-outline" size={16} />
          <Text style={styles.infoText}>
            This is an AI-assisted screening and does not replace professional veterinary diagnosis.
            {isBayesian
              ? ' Questionnaire-adjusted likelihoods are experimental and use provisional expert weights.'
              : ''}
            {' '}Consult a vet for definitive results.
          </Text>
        </View>

        {canBook && (
          <Pressable
            disabled={createScreening.isPending}
            onPress={handleSaveAndBook}
            style={[styles.actionBtn, styles.primaryBtn, createScreening.isPending && styles.actionBtnDisabled]}
          >
            {createScreening.isPending ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <MaterialCommunityIcons color="#FFF" name="calendar-plus" size={16} />
            )}
            <Text style={[styles.actionBtnText, { color: '#FFF' }]}>
              {createScreening.isPending ? 'Saving...' : 'Book Appointment'}
            </Text>
          </Pressable>
        )}

        {saveError && (
          <View style={styles.saveErrorRow}>
            <MaterialCommunityIcons color="#C0392B" name="alert-circle-outline" size={16} />
            <Text style={styles.saveErrorText}>
              Couldn&apos;t save the scan. Check your connection and try again.
            </Text>
          </View>
        )}

        <Pressable
          onPress={() =>
            router.replace({
              pathname: '/(owner)/pets/screening',
              params: { petId: params.petId, petName: params.petName },
            })
          }
          style={[styles.actionBtn, styles.secondaryBtn, styles.scanAgainBtn, { borderColor: colors.border }]}
        >
          <MaterialCommunityIcons color={colors.primary} name="camera" size={16} />
          <Text style={[styles.actionBtnText, { color: colors.primary }]}>Scan Again</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  header: { height: 50, marginHorizontal: 10, marginBottom: 8, marginTop: -10 },
  headerBack: {
    alignItems: 'center',
    height: 50,
    justifyContent: 'center',
    width: 50,
    marginTop: 20,
  }, 
  headerTitle: { ...font.extrabold, color: colors.text, fontSize: 20, marginTop: -40, marginLeft: 50 },
  headerRight: { width: 20 },


  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },

  imageRow: { alignItems: 'center', flexDirection: 'row', gap: 14, marginBottom: 20 },
  thumbnail: { borderRadius: 14, height: 56, width: 56 },
  reportStrip: { flexDirection: 'row', gap: 10, marginBottom: 20, marginTop: -8 },
  rejectionNote: { alignItems: 'flex-start', flexDirection: 'row', gap: 6, marginBottom: 16, marginTop: -10 },
  rejectionText: { ...font.regular, color: colors.textMuted, flex: 1, fontSize: 12, lineHeight: 17 },
  stoppingNote: {
    alignItems: 'flex-start',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  stoppingText: { ...font.regular, color: colors.textMuted, flex: 1, fontSize: 12, lineHeight: 17 },
  reportItem: { position: 'relative' },
  reportThumb: { borderRadius: 12, height: 56, width: 56 },
  reportThumbFailed: { opacity: 0.4 },
  reportBadge: {
    alignItems: 'center',
    borderRadius: 9,
    bottom: -4,
    height: 18,
    justifyContent: 'center',
    position: 'absolute',
    right: -4,
    width: 18,
  },
  reportBadgeOk: { backgroundColor: '#27AE60' },
  reportBadgeFail: { backgroundColor: '#C0392B' },
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
  timestamp: { ...font.regular, color: colors.textMuted, fontSize: 12, marginTop: 2 },

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
  comparisonText: {
    color: colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 17,
    marginTop: 10,
    textAlign: 'center',
  },
  moreCountText: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  breakdownTitle: { ...font.bold, color: colors.text, fontSize: 15, marginBottom: 16 },

  narrowBtn: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 16,
    paddingVertical: 12,
  },
  narrowBtnText: { ...font.bold, fontSize: 13 },

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
  scanAgainBtn: { marginTop: 12 },
  actionBtnText: { ...font.bold, fontSize: 14 },

  saveErrorRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: '#C0392B',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  saveErrorText: { ...font.semibold, color: '#C0392B', flex: 1, fontSize: 12, lineHeight: 17 },
})
