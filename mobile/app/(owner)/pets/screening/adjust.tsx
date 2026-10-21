import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
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
import { DISEASE_LABELS } from '../../../../ai/constants/diseases'
import type { Prediction } from '../../../../ai/types/ai.types'
import { KNOWLEDGE } from '../../../../ai/decisionTree/knowledge'
import { refinePredictions } from '../../../../ai/decisionTree/engine'
import {
  ADAPTIVE_CONFIG,
  ADAPTIVE_UNCERTAIN_MESSAGE,
  EXPERIMENTAL_NOTICE,
  answerQuestion,
  buildAdaptiveResultPayload,
  buildVetVoteLikelihoodProfile,
  createAdaptiveSession,
  createSessionKey,
  isExperimentalSession,
  resolveStrategy,
} from '../../../../ai/adaptive'
import type { AdaptiveSession } from '../../../../ai/adaptive'
import {
  clearAdaptiveSession,
  loadAdaptiveSession,
  saveAdaptiveSession,
} from '../../../../ai/adaptive/sessionStorage'
import { useCreateScreening } from '../../../../features/screening/hooks/useCreateScreening'

interface HistoryEntry {
  session: AdaptiveSession
  selected: string[]
}

export default function AdjustScreen() {
  const router = useRouter()
  const { colors, isDark } = useTheme()
  const createScreening = useCreateScreening()
  const params = useLocalSearchParams<{
    predictions: string
    petId: string
    petName: string
    imageUri?: string
    modelVersion?: string
    inferenceTimeMs?: string
    imageReports?: string
  }>()
  const styles = useMemo(() => createStyles(colors), [colors])
  const profile = useMemo(() => buildVetVoteLikelihoodProfile(KNOWLEDGE), [])

  const predictions: Prediction[] = useMemo(() => {
    try {
      return JSON.parse(params.predictions || '[]')
    } catch {
      return []
    }
  }, [params.predictions])

  const [session, setSession] = useState<AdaptiveSession | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const submittingRef = useRef(false)

  const hasResult = predictions.length > 0
  const question = session?.currentQuestionId
    ? KNOWLEDGE.questions.find((item) => item.id === session.currentQuestionId) ?? null
    : null
  const total =
    session?.strategy === 'fixed_order'
      ? KNOWLEDGE.questions.length
      : ADAPTIVE_CONFIG.maxQuestions
  const questionNumber = Math.min((session?.questionCount ?? 0) + 1, total)
  const progressPct =
    total > 0 ? Math.min(100, Math.round(((session?.questionCount ?? 0) / total) * 100)) : 0
  const isLastPossible = (session?.questionCount ?? 0) + 1 >= total
  const canProceed = selected.length > 0

  useEffect(() => {
    let cancelled = false

    const initialise = async () => {
      if (!hasResult) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      const sessionKey = createSessionKey(
        params.petId,
        predictions,
        params.modelVersion ?? '',
      )
      const expectedStrategy = resolveStrategy(ADAPTIVE_CONFIG, profile)
      const saved = await loadAdaptiveSession(sessionKey)

      if (cancelled) return

      if (
        saved &&
        saved.strategy === expectedStrategy &&
        saved.profileId === profile.id
      ) {
        const currentIsValid =
          saved.currentQuestionId === null ||
          KNOWLEDGE.questions.some((item) => item.id === saved.currentQuestionId)
        if (currentIsValid) {
          setSession(saved)
          setSelected(
            saved.currentQuestionId ? saved.answers[saved.currentQuestionId] ?? [] : [],
          )
          setIsLoading(false)
          return
        }
        await clearAdaptiveSession()
      }

      const created = createAdaptiveSession({
        predictions,
        knowledge: KNOWLEDGE,
        profile,
        config: ADAPTIVE_CONFIG,
        sessionKey,
      })
      if (cancelled) return

      setSession(created)
      setSelected([])
      setIsLoading(false)
      void saveAdaptiveSession(created)
    }

    void initialise()

    return () => {
      cancelled = true
    }
  }, [hasResult, params.modelVersion, params.petId, predictions, profile])

  const finish = async (completed: AdaptiveSession) => {
    if (submittingRef.current) return
    submittingRef.current = true
    setIsSubmitting(true)
    setError('')

    try {
      if (completed.strategy === 'information_gain') {
        const payload = buildAdaptiveResultPayload(completed, DISEASE_LABELS)
        let alreadySaved = false

        // Only a completed, non-conflicting adaptive outcome is persisted as a
        // screening. An uncertain outcome is shown to the owner but never
        // forced into a disease label or auto-saved.
        if (payload.state === 'DISEASE_DETECTED' && payload.top) {
          try {
            await createScreening.mutateAsync({
              pet_id: params.petId,
              source: 'DEVICE',
              prediction: payload.top.disease,
              // The backend's existing confidence field receives the relative
              // evidence score. It is not a calibrated probability.
              confidence: Math.round(payload.top.confidence),
              model_version: params.modelVersion || 'unknown',
              inference_time_ms: Number(params.inferenceTimeMs) || undefined,
              device: Platform.OS,
            })
            alreadySaved = true
          } catch {
            // Auto-save failed — the result screen's Save & Book can retry.
          }
        }

        await clearAdaptiveSession()
        router.replace({
          pathname: '/(owner)/pets/screening/result',
          params: {
            imageUri: params.imageUri ?? '',
            petId: params.petId,
            petName: params.petName,
            predictions: params.predictions,
            modelVersion: params.modelVersion ?? '',
            inferenceTimeMs: params.inferenceTimeMs ?? '0',
            state: payload.state,
            stateMessage: payload.state === 'UNCERTAIN' ? ADAPTIVE_UNCERTAIN_MESSAGE : '',
            alreadySaved: alreadySaved ? 'true' : 'false',
            imageReports: params.imageReports ?? '',
            adaptive: JSON.stringify(payload),
          },
        })
        return
      }

      // Fixed-order fallback: preserve the existing rule-based result.
      const refined = refinePredictions(predictions, completed.answers, KNOWLEDGE)
      let alreadySaved = false
      try {
        await createScreening.mutateAsync({
          pet_id: params.petId,
          source: 'DEVICE',
          prediction: refined.refinedTop.disease,
          confidence: Math.round(refined.refinedTop.confidence),
          model_version: params.modelVersion || 'unknown',
          inference_time_ms: Number(params.inferenceTimeMs) || undefined,
          device: Platform.OS,
        })
        alreadySaved = true
      } catch {
        // Auto-save failed — the result screen's Save & Book can retry.
      }

      await clearAdaptiveSession()
      router.replace({
        pathname: '/(owner)/pets/screening/result',
        params: {
          imageUri: params.imageUri ?? '',
          petId: params.petId,
          petName: params.petName,
          predictions: params.predictions,
          modelVersion: params.modelVersion ?? '',
          inferenceTimeMs: params.inferenceTimeMs ?? '0',
          state: 'DISEASE_DETECTED',
          stateMessage: '',
          refined: JSON.stringify(refined.refined),
          changed: refined.changed ? 'true' : 'false',
          alreadySaved: alreadySaved ? 'true' : 'false',
          imageReports: params.imageReports ?? '',
        },
      })
    } catch (finishError) {
      setError(
        finishError instanceof Error
          ? finishError.message
          : 'Could not finish the follow-up. Please try again.',
      )
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  const selectOption = (optionId: string) => {
    if (!question || isSubmitting) return
    setSelected((previous) => {
      if (question.multi) {
        return previous.includes(optionId)
          ? previous.filter((id) => id !== optionId)
          : [...previous, optionId]
      }
      return [optionId]
    })
  }

  const goNext = () => {
    if (!session || !question || !canProceed || isSubmitting) return
    setError('')

    const snapshot: HistoryEntry = {
      session,
      selected: [...selected],
    }

    try {
      const updated = answerQuestion(session, question.id, selected, {
        knowledge: KNOWLEDGE,
        profile,
        config: ADAPTIVE_CONFIG,
      })
      setHistory((previous) => [...previous, snapshot])
      setSession(updated)
      void saveAdaptiveSession(updated)

      if (updated.currentQuestionId === null) {
        void finish(updated)
      } else {
        setSelected(updated.answers[updated.currentQuestionId] ?? [])
      }
    } catch (answerError) {
      setError(
        answerError instanceof Error
          ? answerError.message
          : 'Could not save this answer. Please try again.',
      )
    }
  }

  const goBack = () => {
    if (submittingRef.current) return

    if (history.length > 0) {
      const previous = history[history.length - 1]
      setHistory((items) => items.slice(0, -1))
      setSession(previous.session)
      setSelected(previous.selected)
      setError('')
      void saveAdaptiveSession(previous.session)
      return
    }

    router.back()
  }

  const resetSession = async () => {
    if (!hasResult || submittingRef.current) return
    await clearAdaptiveSession()
    const created = createAdaptiveSession({
      predictions,
      knowledge: KNOWLEDGE,
      profile,
      config: ADAPTIVE_CONFIG,
      sessionKey: createSessionKey(params.petId, predictions, params.modelVersion ?? ''),
    })
    setSession(created)
    setHistory([])
    setSelected([])
    setError('')
    void saveAdaptiveSession(created)
  }

  const header = (
    <View style={styles.header}>
      <Pressable onPress={goBack} hitSlop={8} style={styles.headerBack}>
        <MaterialCommunityIcons color={colors.text} name="arrow-left" size={22} />
      </Pressable>
      <Text style={styles.headerTitle}>Quick Skin Check</Text>
      <View style={styles.headerRight} />
    </View>
  )

  const experimentalNotice =
    session && isExperimentalSession(session) ? (
      <View style={[styles.noticeCard, { backgroundColor: colors.surfaceAlt }]}>
        <MaterialCommunityIcons color={colors.textMuted} name="flask-outline" size={16} />
        <Text style={styles.noticeText}>{EXPERIMENTAL_NOTICE}</Text>
      </View>
    ) : null

  if (!hasResult) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={styles.safeArea.backgroundColor} />
        {header}
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons color={colors.textMuted} name="alert-circle-outline" size={32} />
          <Text style={styles.emptyTitle}>No screening result</Text>
          <Text style={styles.emptyText}>Go back and run a screening first.</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (isLoading || !session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={styles.safeArea.backgroundColor} />
        {header}
        <View style={styles.emptyCard}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={styles.emptyText}>Preparing follow-up questions...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!session.currentQuestionId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={styles.safeArea.backgroundColor} />
        {header}
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {experimentalNotice}
          {error ? (
            <View style={styles.errorCard}>
              <MaterialCommunityIcons color="#C0392B" name="alert-circle-outline" size={16} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          <View style={styles.completeCard}>
            <View style={[styles.completeIcon, { backgroundColor: colors.primaryLight }]}>
              <MaterialCommunityIcons color={colors.primary} name="check" size={30} />
            </View>
            <Text style={styles.completeTitle}>Follow-up complete</Text>
            <Text style={styles.completeText}>
              {session.strategy === 'fixed_order'
                ? 'All follow-up questions have been answered.'
                : session.questionCount === 0
                  ? 'No follow-up question was expected to add meaningful evidence for this image.'
                  : `${session.questionCount} adaptive ${
                      session.questionCount === 1 ? 'answer was' : 'answers were'
                    } recorded.`}
            </Text>
            <Text style={styles.completeHint}>
              The result separates the original image output from the follow-up evidence.
            </Text>
          </View>
        </ScrollView>
        <View style={styles.bottomBar}>
          <Pressable
            onPress={() => void finish(session)}
            disabled={isSubmitting}
            style={[styles.actionBtn, styles.primaryBtn, isSubmitting && styles.actionBtnDisabled]}
          >
            {isSubmitting && <ActivityIndicator color="#FFF" size="small" />}
            <Text style={[styles.actionBtnText, { color: '#FFF' }]}>
              {isSubmitting ? 'Preparing...' : 'See Results'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  if (!question) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={styles.safeArea.backgroundColor} />
        {header}
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons color={colors.textMuted} name="alert-circle-outline" size={32} />
          <Text style={styles.emptyTitle}>Question unavailable</Text>
          <Text style={styles.emptyText}>This follow-up question is no longer available.</Text>
          <Pressable onPress={() => void resetSession()} style={[styles.actionBtn, styles.primaryBtn, styles.resetBtn]}>
            <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Start over</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={styles.safeArea.backgroundColor} />
      {header}

      <View style={styles.progressSection}>
        <Text style={styles.progressLabel}>
          {session.strategy === 'fixed_order'
            ? `Question ${questionNumber} of ${total}`
            : `Question ${questionNumber} \u00b7 up to ${total}`}
        </Text>
        <View style={[styles.progressTrack, { backgroundColor: colors.surfaceAlt }]}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {experimentalNotice}
        {error ? (
          <View style={styles.errorCard}>
            <MaterialCommunityIcons color="#C0392B" name="alert-circle-outline" size={16} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{question.text}</Text>
          {question.hint ? <Text style={styles.questionHint}>{question.hint}</Text> : null}
        </View>

        <View style={styles.optionsList}>
          {question.options.map((option) => {
            const isSelected = selected.includes(option.id)
            return (
              <Pressable
                key={option.id}
                onPress={() => selectOption(option.id)}
                style={[styles.option, isSelected && styles.optionActive]}
              >
                <View
                  style={[
                    styles.optionMark,
                    question.multi ? styles.optionMarkMulti : styles.optionMarkRadio,
                    isSelected && styles.optionMarkActive,
                  ]}
                >
                  {isSelected &&
                    (question.multi ? (
                      <MaterialCommunityIcons color="#FFF" name="check" size={12} />
                    ) : (
                      <View style={styles.optionDot} />
                    ))}
                </View>
                <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>{option.label}</Text>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable
          onPress={goNext}
          disabled={!canProceed || isSubmitting}
          style={[
            styles.actionBtn,
            styles.primaryBtn,
            (!canProceed || isSubmitting) && styles.actionBtnDisabled,
          ]}
        >
          {isSubmitting && <ActivityIndicator color="#FFF" size="small" />}
          <Text style={[styles.actionBtnText, { color: '#FFF' }]}>
            {isSubmitting ? 'Saving...' : isLastPossible ? 'See Results' : 'Next'}
          </Text>
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
  headerTitle: { ...font.bold, color: colors.text, flex: 1, fontSize: 17, textAlign: 'center' },
  headerRight: { width: 48 },

  progressSection: { backgroundColor: colors.surface, gap: 8, paddingHorizontal: 24, paddingBottom: 14 },
  progressLabel: { ...font.semibold, color: colors.textMuted, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  progressTrack: { borderRadius: 4, height: 6, overflow: 'hidden', width: '100%' },
  progressFill: { backgroundColor: '#B96534', borderRadius: 4, height: '100%' },

  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 120 },

  questionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    marginBottom: 18,
    padding: 18,
  },
  questionText: { ...font.bold, color: colors.text, fontSize: 16, lineHeight: 23 },
  questionHint: { ...font.regular, color: colors.textMuted, fontSize: 12, lineHeight: 17 },

  optionsList: { gap: 10 },
  option: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  optionMark: {
    alignItems: 'center',
    borderColor: colors.border,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  optionMarkRadio: { borderRadius: 10 },
  optionMarkMulti: { borderRadius: 6 },
  optionMarkActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionDot: { backgroundColor: '#FFF', borderRadius: 4, height: 8, width: 8 },
  optionText: { ...font.medium, color: colors.text, flex: 1, fontSize: 14, lineHeight: 19 },
  optionTextActive: { ...font.bold },

  imageRow: { alignItems: 'center', flexDirection: 'row', gap: 14, marginBottom: 20 },
  thumbnail: { borderRadius: 14, height: 56, width: 56 },
  thumbnailPlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.iconBg,
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  imageInfo: { flex: 1 },
  petName: { ...font.bold, color: colors.text, fontSize: 16 },
  timestamp: { ...font.regular, color: colors.textMuted, fontSize: 12, marginTop: 2 },

  verdictCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    padding: 16,
  },
  verdictText: { ...font.regular, color: colors.text, flex: 1, fontSize: 13, lineHeight: 19 },

  breakdownCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    padding: 18,
  },
  breakdownTitle: { ...font.bold, color: colors.text, fontSize: 15, marginBottom: 16 },
  barRow: { gap: 6, marginBottom: 14 },
  barLabelRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  barLabel: { ...font.medium, color: '#A0A0A0', flex: 1, fontSize: 13 },
  barPct: { ...font.semibold, color: '#A0A0A0', fontSize: 13, marginLeft: 8, minWidth: 36, textAlign: 'right' },
  barTrack: { borderRadius: 4, height: 8, overflow: 'hidden', width: '100%' },
  barFill: { borderRadius: 4, height: '100%' },

  infoCard: {
    alignItems: 'flex-start',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoText: { ...font.regular, color: colors.textMuted, flex: 1, fontSize: 12, lineHeight: 17 },

  noticeCard: {
    alignItems: 'flex-start',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noticeText: { ...font.regular, color: colors.textMuted, flex: 1, fontSize: 11, lineHeight: 16 },

  errorCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: '#C0392B',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: { ...font.semibold, color: '#C0392B', flex: 1, fontSize: 12, lineHeight: 17 },

  completeCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  completeIcon: {
    alignItems: 'center',
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    marginBottom: 4,
    width: 64,
  },
  completeTitle: { ...font.extrabold, color: colors.text, fontSize: 20, textAlign: 'center' },
  completeText: { ...font.regular, color: colors.text, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  completeHint: { ...font.regular, color: colors.textMuted, fontSize: 12, lineHeight: 17, textAlign: 'center' },

  emptyCard: { alignItems: 'center', flex: 1, gap: 8, justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { ...font.bold, color: colors.text, fontSize: 16 },
  emptyText: { ...font.regular, color: colors.textMuted, fontSize: 13, textAlign: 'center' },

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
  actionBtnDisabled: { opacity: 0.6 },
  primaryBtn: { backgroundColor: '#B96534' },
  secondaryBtn: { backgroundColor: colors.surface, borderWidth: 1.5 },
  resetBtn: { flex: 0, marginTop: 8, paddingHorizontal: 24 },
  actionBtnText: { ...font.bold, fontSize: 14 },
})
