import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
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
import type { Prediction } from '../../../../ai/types/ai.types'
import { KNOWLEDGE } from '../../../../ai/decisionTree/knowledge'
import { REFINEMENT_METHOD } from '../../../../ai/decisionTree/bayesian.config'
import { ADAPTIVE_CONFIG } from '../../../../ai/decisionTree/adaptive.config'
import { commitAdaptiveAnswer, evaluateStopping, resolveQuestionnaireMode, selectNextQuestion } from '../../../../ai/decisionTree/adaptive'
import { refinePredictionsBayesian } from '../../../../ai/decisionTree/bayesian'
import { refinePredictions } from '../../../../ai/decisionTree/engine'
import { buildScreeningSummary } from '../../../../ai/decisionTree/summary'
import type { Answers, BayesianRefinementResult, StoppingDecision } from '../../../../ai/decisionTree/types'
import { useCreateScreening } from '../../../../features/screening/hooks/useCreateScreening'

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
    thumbnailUris?: string
  }>()
  const styles = useMemo(() => createStyles(colors), [colors])

  const questions = KNOWLEDGE.questions
  const total = questions.length
  const mode = useMemo(() => resolveQuestionnaireMode(REFINEMENT_METHOD), [])
  const questionById = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [questions],
  )

  const predictions: Prediction[] = useMemo(() => {
    try {
      return JSON.parse(params.predictions || '[]')
    } catch {
      return []
    }
  }, [params.predictions])

  const [answers, setAnswers] = useState<Answers>({})
  const [askedIds, setAskedIds] = useState<string[]>([])
  const [cursor, setCursor] = useState(0)
  const [drafts, setDrafts] = useState<Answers>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const hasResult = predictions.length > 0

  const question = useMemo(() => {
    if (cursor < askedIds.length) {
      return questionById.get(askedIds[cursor]) ?? null
    }
    return selectNextQuestion(predictions, answers, askedIds, KNOWLEDGE, mode)
  }, [answers, askedIds, cursor, mode, predictions, questionById])

  const selected = question ? drafts[question.id] ?? answers[question.id] ?? [] : []
  const isLast = questions.every(
    (item) => item.id === question?.id || askedIds.includes(item.id),
  )
  const canProceed = Boolean(question) && selected.length > 0
  const pendingDecision = useMemo(() => {
    if (!question || selected.length === 0) return null
    const committed = commitAdaptiveAnswer(
      { answers, askedQuestionIds: askedIds },
      question.id,
      selected,
    )
    return evaluateStopping(
      predictions,
      committed.answers,
      committed.askedQuestionIds,
      KNOWLEDGE,
      ADAPTIVE_CONFIG,
      mode.earlyStopping,
    )
  }, [answers, askedIds, mode.earlyStopping, predictions, question, selected])
  const willStop = pendingDecision?.shouldStop === true

  const selectOption = (optionId: string) => {
    if (!question) return
    setDrafts((prev) => {
      const current = prev[question.id] ?? answers[question.id] ?? []
      if (question.multi) {
        const next = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId]
        return { ...prev, [question.id]: next }
      }
      return { ...prev, [question.id]: [optionId] }
    })
  }

  const finish = async (
    finalAnswers: Answers,
    finalAskedIds: readonly string[],
    decision: StoppingDecision,
  ) => {
    if (isSubmitting) return
    setIsSubmitting(true)

    let refined
    try {
      refined = REFINEMENT_METHOD === 'bayesian-provisional-v1'
        ? refinePredictionsBayesian(predictions, finalAnswers, KNOWLEDGE)
        : refinePredictions(predictions, finalAnswers, KNOWLEDGE)
    } catch {
      setIsSubmitting(false)
      return
    }

    const summary = REFINEMENT_METHOD === 'bayesian-provisional-v1'
      ? JSON.stringify(
        buildScreeningSummary(
          predictions,
          finalAnswers,
          finalAskedIds,
          refined as BayesianRefinementResult,
          KNOWLEDGE,
        ),
      )
      : ''

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
      // Auto-save failed — the result screen's Save&Book will retry.
    }

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
        summary,
        changed: refined.changed ? 'true' : 'false',
        refinementMethod: REFINEMENT_METHOD,
        stoppingReason: decision.reason ?? '',
        answeredCount: String(decision.answeredCount),
        totalQuestions: String(decision.totalQuestions),
        alreadySaved: alreadySaved ? 'true' : 'false',
        imageReports: params.imageReports ?? '',
        thumbnailUris: params.thumbnailUris ?? '',
      },
    })
  }

  const goNext = () => {
    if (!question || !canProceed || isSubmitting) return

    const committed = commitAdaptiveAnswer(
      { answers, askedQuestionIds: askedIds },
      question.id,
      selected,
    )
    const decision = evaluateStopping(
      predictions,
      committed.answers,
      committed.askedQuestionIds,
      KNOWLEDGE,
      ADAPTIVE_CONFIG,
      mode.earlyStopping,
    )

    if (decision.shouldStop) {
      void finish(committed.answers, committed.askedQuestionIds, decision)
      return
    }

    setAnswers(committed.answers)
    setAskedIds(committed.askedQuestionIds)
    setCursor(cursor + 1)
  }

  const goBack = () => {
    if (cursor > 0) {
      setCursor(cursor - 1)
    } else {
      router.back()
    }
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

  if (!question) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={styles.safeArea.backgroundColor} />
        {header}
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons color={colors.textMuted} name="check-circle-outline" size={32} />
          <Text style={styles.emptyTitle}>Questionnaire complete</Text>
          <Text style={styles.emptyText}>All available questions have been answered.</Text>
        </View>
      </SafeAreaView>
    )
  }

  const progressPct = Math.round(((cursor + 1) / total) * 100)

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={styles.safeArea.backgroundColor} />
      {header}

      <View style={styles.progressSection}>
        <Text style={styles.progressLabel}>
          Question {cursor + 1} of {total}
        </Text>
        <View style={[styles.progressTrack, { backgroundColor: colors.surfaceAlt }]}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
            {isSubmitting ? 'Saving...' : isLast || willStop ? 'See Suggestions' : 'Next'}
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
  actionBtnText: { ...font.bold, fontSize: 14 },
})
