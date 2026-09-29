import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { useTheme, type AppColors } from '../../../../src/context/ThemeContext'
import { apiErrorMessage } from '../../../../src/utils/error'
import { useCreateScreening } from '../../../../features/screening/hooks/useCreateScreening'
import { useScreeningQuiz } from '../../../../features/screening/hooks/useScreeningQuiz'
import type { QuizAnswer, RefinementAudit, SecondCheckVerdict } from '../../../../features/screening/types'
import type { Prediction } from '../../../../ai/types/ai.types'

const DISEASE_META: Record<string, { color: string; icon: string }> = {
  ALLERGIC_DERMATITIS: { color: '#E67E22', icon: 'alert-circle-outline' },
  BACTERIAL: { color: '#C0392B', icon: 'bacteria-outline' },
  FUNGAL: { color: '#8E44AD', icon: 'flower-tulip-outline' },
  HOTSPOT: { color: '#D35400', icon: 'fire' },
  MANGE: { color: '#27AE60', icon: 'bug-outline' },
}

const CHECK_META: Record<string, { label: string; color: string; bg: string }> = {
  AGREE: { label: 'CONSISTENT', color: '#2E7D32', bg: '#E8F5E9' },
  DISAGREE: { label: 'INCONSISTENT', color: '#B26A00', bg: '#FFF3E0' },
  UNCERTAIN: { label: 'UNCERTAIN', color: '#616161', bg: '#EEEEEE' },
}

const ANSWER_OPTIONS: { value: QuizAnswer; label: string }[] = [
  { value: 'YES', label: 'Yes' },
  { value: 'NO', label: 'No' },
  { value: 'NOT_SURE', label: 'Not sure' },
]

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
        <Text style={[barStyles.pct, isTop && { color: colors.text, fontWeight: '700' }]}>{pct}%</Text>
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
  label: { color: '#A0A0A0', flex: 1, fontSize: 13, fontWeight: '500' },
  pct: { color: '#A0A0A0', fontSize: 13, fontWeight: '600', marginLeft: 8, minWidth: 36, textAlign: 'right' },
  track: { borderRadius: 4, height: 8, overflow: 'hidden', width: '100%' },
  fill: { borderRadius: 4, height: '100%' },
})

export default function ResultScreen() {
  const router = useRouter()
  const { colors, isDark } = useTheme()
  const params = useLocalSearchParams<{
    imageUri: string
    petId: string
    petName: string
    predictions: string
    modelVersion: string
    inferenceTimeMs: string
  }>()
  const styles = useMemo(() => createStyles(colors), [colors])
  const saveScreening = useCreateScreening()
  const [consented, setConsented] = useState(false)

  const saved = saveScreening.isSuccess

  const predictions: Prediction[] = useMemo(() => {
    try {
      return JSON.parse(params.predictions || '[]')
    } catch {
      return []
    }
  }, [params.predictions])

  const quiz = useScreeningQuiz({
    petId: params.petId,
    predictions,
    imageUri: params.imageUri,
  })

  const sorted = useMemo(() => [...predictions].sort((a, b) => b.confidence - a.confidence), [predictions])
  const top = sorted[0]
  const refined = quiz.refined
  const displayDiseaseCode = refined?.disease_code ?? top?.disease
  const displayLabel = refined?.disease_name ?? top?.label
  const displayConfidence = refined?.confidence ?? top?.confidence
  const topMeta = displayDiseaseCode
    ? DISEASE_META[displayDiseaseCode] ?? { color: colors.primary, icon: 'help-circle-outline' }
    : null
  const confidencePct = Math.round(displayConfidence ?? 0)
  const quizReady = quiz.status === 'refined' || quiz.status === 'failed'

  const handleSave = () => {
    if (!consented || !top || !quizReady || saved || saveScreening.isPending) return

    const original = sorted.slice(0, 3).map((p) => ({
      disease: p.disease,
      confidence: p.confidence,
    }))
    const answersAudit = Object.fromEntries(
      Object.entries(quiz.answers).map(([id, answer]) => [String(id), answer]),
    )
    const refinement: RefinementAudit | undefined = refined
      ? {
          original,
          questions: quiz.questions,
          answers: answersAudit,
          refined: {
            disease: refined.disease_code,
            confidence: refined.confidence,
            rationale: refined.rationale,
          },
        }
      : undefined

    saveScreening.mutate({
      pet_id: params.petId,
      source: 'DEVICE',
      prediction: refined?.disease_code ?? top.disease,
      confidence: Number((refined?.confidence ?? top.confidence).toFixed(2)),
      model_version: params.modelVersion || 'unknown',
      inference_time_ms: Number(params.inferenceTimeMs) || undefined,
      image: quiz.imageBase64 ?? undefined,
      refinement,
    })
  }

  const check = saved ? saveScreening.data : undefined
  const checkVerdict = check?.ais_check_verdict as SecondCheckVerdict | null | undefined
  const checkMeta = checkVerdict ? CHECK_META[checkVerdict] : undefined

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
          {params.imageUri && (
            <Image source={{ uri: params.imageUri }} style={styles.thumbnail} />
          )}
          <View style={styles.imageInfo}>
            <Text style={styles.petName}>{params.petName}</Text>
            <Text style={styles.timestamp}>Just now</Text>
          </View>
        </View>

        {top && topMeta && (
          <View style={[styles.topCard, { borderColor: topMeta.color + '30' }]}>
            <View style={[styles.topIconCircle, { backgroundColor: topMeta.color + '18' }]}>
              <MaterialCommunityIcons color={topMeta.color} name={topMeta.icon as any} size={28} />
            </View>
            <Text style={styles.topLabel}>Predicted Condition</Text>
            <Text style={[styles.topDisease, { color: topMeta.color }]}>{displayLabel}</Text>
            <View style={styles.confidenceBadge}>
              <Text style={[styles.confidenceText, { color: topMeta.color }]}>{confidencePct}%</Text>
              <Text style={styles.confidenceLabel}>confidence</Text>
            </View>
            {refined && (
              <View style={[styles.refinedChip, { backgroundColor: topMeta.color + '18' }]}>
                <MaterialCommunityIcons color={topMeta.color} name="account-check-outline" size={13} />
                <Text style={[styles.refinedChipText, { color: topMeta.color }]}>
                  Refined by symptom check
                </Text>
              </View>
            )}
            {refined && <Text style={styles.refinedRationale}>{refined.rationale}</Text>}
          </View>
        )}

        {!saved && (
          <View style={styles.quizCard}>
            <View style={styles.checkHeader}>
              <MaterialCommunityIcons color={colors.primary} name="clipboard-check-outline" size={18} />
              <Text style={styles.checkTitle}>Symptom Check</Text>
              {quiz.status === 'refined' && (
                <View style={[styles.checkChip, { backgroundColor: '#E8F5E9' }]}>
                  <Text style={[styles.checkChipText, { color: '#2E7D32' }]}>DONE</Text>
                </View>
              )}
            </View>

            {quiz.status === 'loading' && (
              <View style={styles.quizLoading}>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={styles.quizLoadingText}>Preparing your questions…</Text>
              </View>
            )}

            {quiz.status === 'failed' && (
              <Text style={styles.quizWarn}>
                Questions unavailable {'\u2014'} continue with the model result.
              </Text>
            )}

            {(quiz.status === 'ready' || quiz.status === 'validating') && (
              <>
                {quiz.questions.map((q, index) => (
                  <View key={q.id} style={styles.questionBlock}>
                    <Text style={styles.questionText}>
                      {index + 1}. {q.text}
                    </Text>
                    <View style={styles.answerRow}>
                      {ANSWER_OPTIONS.map((option) => {
                        const active = quiz.answers[q.id] === option.value
                        return (
                          <Pressable
                            key={option.value}
                            onPress={() => quiz.setAnswer(q.id, option.value)}
                            disabled={quiz.status === 'validating'}
                            style={[styles.answerBtn, active && styles.answerBtnActive]}
                          >
                            <Text style={[styles.answerText, active && styles.answerTextActive]}>
                              {option.label}
                            </Text>
                          </Pressable>
                        )
                      })}
                    </View>
                  </View>
                ))}
                <Pressable
                  onPress={quiz.submit}
                  disabled={!quiz.allAnswered || quiz.status === 'validating'}
                  style={[
                    styles.refineBtn,
                    (!quiz.allAnswered || quiz.status === 'validating') && styles.saveBtnDisabled,
                  ]}
                >
                  {quiz.status === 'validating' ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <MaterialCommunityIcons color="#FFF" name="account-search-outline" size={18} />
                  )}
                  <Text style={styles.saveBtnText}>
                    {quiz.status === 'validating' ? 'Checking…' : 'Get refined result'}
                  </Text>
                </Pressable>
              </>
            )}

            {quiz.status === 'refined' && (
              <Text style={styles.quizDone}>
                Questions answered {'\u2014'} result refined from your answers.
              </Text>
            )}
          </View>
        )}

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

        {saved && checkVerdict && check && (
          <View style={styles.checkCard}>
            <View style={styles.checkHeader}>
              <MaterialCommunityIcons
                color={checkMeta?.color ?? colors.textSecondary}
                name="shield-check-outline"
                size={18}
              />
              <Text style={styles.checkTitle}>Second Check</Text>
              {checkMeta && (
                <View style={[styles.checkChip, { backgroundColor: checkMeta.bg }]}>
                  <Text style={[styles.checkChipText, { color: checkMeta.color }]}>
                    {checkMeta.label}
                  </Text>
                </View>
              )}
            </View>
            {checkVerdict === 'UNAVAILABLE' ? (
              <Text style={styles.checkNotes}>
                Second check unavailable {'\u2014'} try again later.
              </Text>
            ) : (
              !!check.ais_check_notes && (
                <Text style={styles.checkNotes}>{check.ais_check_notes}</Text>
              )
            )}
            {!!check.ais_check_remedy && checkVerdict !== 'UNAVAILABLE' && (
              <View style={styles.remedyBox}>
                <Text style={styles.remedyLabel}>Home care while you wait</Text>
                <Text style={styles.remedyText}>{check.ais_check_remedy}</Text>
              </View>
            )}
            <Text style={styles.checkDisclaimer}>
              Advisory second check {check.ais_check_model ? `(${check.ais_check_model})` : ''}
              {' \u2014'} not a diagnosis. Consult a veterinarian.
            </Text>
          </View>
        )}

        <View style={[styles.infoCard, { backgroundColor: colors.surfaceAlt }]}>
          <MaterialCommunityIcons color={colors.textMuted} name="information-outline" size={16} />
          <Text style={styles.infoText}>
            This is an AI-assisted screening and does not replace professional veterinary diagnosis.
            Consult a vet for definitive results.
          </Text>
        </View>

        {saveScreening.isError && (
          <View style={[styles.banner, styles.bannerError, { backgroundColor: colors.surface }]}>
            <MaterialCommunityIcons color={colors.error} name="alert-circle-outline" size={16} />
            <Text style={[styles.bannerText, { color: colors.error }]}>{apiErrorMessage(saveScreening.error)}</Text>
          </View>
        )}

        {saved ? (
          <View style={[styles.banner, styles.bannerSuccess]}>
            <MaterialCommunityIcons color="#2E7D32" name="check-circle-outline" size={16} />
            <Text style={[styles.bannerText, { color: '#2E7D32' }]}>
              Screening saved to {params.petName}&apos;s medical record.
            </Text>
          </View>
        ) : (
          <>
            <Pressable
              onPress={() => setConsented((value) => !value)}
              disabled={saveScreening.isPending || !quizReady}
              style={styles.consentRow}
            >
              <MaterialCommunityIcons
                color={consented ? '#B96534' : colors.textMuted}
                name={consented ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={22}
              />
              <Text style={styles.consentText}>
                I consent to save this on-device AI screening result and its metadata to my
                pet&apos;s medical record for veterinary review.
              </Text>
            </Pressable>

            {!quizReady && (
              <Text style={styles.consentHint}>
                Complete the symptom check above to continue.
              </Text>
            )}

            <Pressable
              onPress={handleSave}
              disabled={!consented || !top || !quizReady || saveScreening.isPending}
              style={[
                styles.saveBtn,
                (!consented || !top || !quizReady || saveScreening.isPending) && styles.saveBtnDisabled,
              ]}
            >
              {saveScreening.isPending ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <MaterialCommunityIcons color="#FFF" name="content-save-outline" size={18} />
              )}
              <Text style={styles.saveBtnText}>
                {saveScreening.isPending ? 'Saving...' : 'Save to Record'}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable
          onPress={() => router.replace('/(owner)/pets/screening')}
          style={[styles.actionBtn, styles.secondaryBtn, { borderColor: colors.border }]}
        >
          <MaterialCommunityIcons color={colors.primary} name="camera" size={16} />
          <Text style={[styles.actionBtnText, { color: colors.primary }]}>Scan Again</Text>
        </Pressable>
        <Pressable
          onPress={() => router.dismissTo('/(owner)')}
          style={[styles.actionBtn, styles.primaryBtn]}
        >
          <MaterialCommunityIcons color="#FFF" name="home" size={16} />
          <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Home</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  header: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    height: 48,
    paddingHorizontal: 4,
  },
  headerBack: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  headerTitle: { color: colors.text, flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  headerRight: { width: 48 },

  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 120 },

  imageRow: { alignItems: 'center', flexDirection: 'row', gap: 14, marginBottom: 20 },
  thumbnail: { borderRadius: 14, height: 56, width: 56 },
  imageInfo: { flex: 1 },
  petName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  timestamp: { color: colors.textMuted, fontSize: 12, marginTop: 2 },

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
  topLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  topDisease: { fontSize: 22, fontWeight: '800', marginTop: 6 },
  confidenceBadge: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 10 },
  confidenceText: { fontSize: 32, fontWeight: '800' },
  confidenceLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  refinedChip: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  refinedChipText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  refinedRationale: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
    textAlign: 'center',
  },

  quizCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    padding: 18,
  },
  quizLoading: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingVertical: 12 },
  quizLoadingText: { color: colors.textSecondary, fontSize: 13 },
  quizWarn: { color: colors.textMuted, fontSize: 13, lineHeight: 19, paddingVertical: 6 },
  quizDone: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, paddingTop: 6 },
  questionBlock: { marginBottom: 14 },
  questionText: { color: colors.text, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  answerRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  answerBtn: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 8,
  },
  answerBtnActive: { backgroundColor: '#B96534', borderColor: '#B96534' },
  answerText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  answerTextActive: { color: '#FFFFFF' },
  refineBtn: {
    alignItems: 'center',
    backgroundColor: '#B96534',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 4,
    paddingVertical: 13,
  },

  breakdownCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    padding: 18,
  },
  breakdownTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 16 },

  checkCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    padding: 18,
  },
  checkHeader: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  checkTitle: { color: colors.text, flex: 1, fontSize: 15, fontWeight: '700' },
  checkChip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  checkChipText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  checkNotes: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 10 },
  checkDisclaimer: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 10 },
  remedyBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    marginTop: 12,
    padding: 10,
  },
  remedyLabel: { color: colors.text, fontSize: 12, fontWeight: '700' },
  remedyText: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 4 },

  infoCard: {
    alignItems: 'flex-start',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoText: { color: colors.textMuted, flex: 1, fontSize: 12, lineHeight: 17 },

  banner: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bannerError: { borderColor: '#C0392B', borderWidth: 1 },
  bannerSuccess: { backgroundColor: '#E8F5E9' },
  bannerText: { flex: 1, fontSize: 13, fontWeight: '600' },

  consentRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  consentText: { color: colors.textSecondary, flex: 1, fontSize: 13, lineHeight: 19 },
  consentHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  saveBtn: {
    alignItems: 'center',
    backgroundColor: '#B96534',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  bottomBar: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    flexDirection: 'row',
    gap: 12,
    left: 0,
    paddingHorizontal: 24,
    paddingVertical: 16,
    position: 'absolute',
    right: 0,
  },
  actionBtn: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  primaryBtn: { backgroundColor: '#B96534' },
  secondaryBtn: { backgroundColor: colors.surface, borderWidth: 1.5 },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
})
