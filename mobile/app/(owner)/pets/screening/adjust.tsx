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
import type { Prediction } from '../../../../ai/types/ai.types'
import { KNOWLEDGE } from '../../../../ai/decisionTree/knowledge'
import { refinePredictions } from '../../../../ai/decisionTree/engine'
import type { Answers } from '../../../../ai/decisionTree/types'
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
  }>()
  const styles = useMemo(() => createStyles(colors), [colors])

  const questions = KNOWLEDGE.questions
  const total = questions.length

  const predictions: Prediction[] = useMemo(() => {
    try {
      return JSON.parse(params.predictions || '[]')
    } catch {
      return []
    }
  }, [params.predictions])

  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const hasResult = predictions.length > 0

  const question = questions[step]
  const selected = answers[question.id] ?? []
  const isLast = step === total - 1
  const canProceed = selected.length > 0

  const selectOption = (optionId: string) => {
    setAnswers((prev) => {
      const current = prev[question.id] ?? []
      if (question.multi) {
        const next = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId]
        return { ...prev, [question.id]: next }
      }
      return { ...prev, [question.id]: [optionId] }
    })
  }

  const finish = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)

    const refined = refinePredictions(predictions, answers, KNOWLEDGE)

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
        changed: refined.changed ? 'true' : 'false',
        alreadySaved: alreadySaved ? 'true' : 'false',
        imageReports: params.imageReports ?? '',
      },
    })
  }

  const goNext = () => {
    if (!canProceed || isSubmitting) return
    if (!isLast) {
      setStep(step + 1)
    } else {
      void finish()
    }
  }

  const goBack = () => {
    if (step > 0) {
      setStep(step - 1)
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

  const progressPct = Math.round(((step + 1) / total) * 100)

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={styles.safeArea.backgroundColor} />
      {header}

      <View style={styles.progressSection}>
        <Text style={styles.progressLabel}>
          Question {step + 1} of {total}
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
            {isSubmitting ? 'Saving...' : isLast ? 'See Suggestions' : 'Next'}
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
  headerTitle: { color: colors.text, flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  headerRight: { width: 48 },

  progressSection: { backgroundColor: colors.surface, gap: 8, paddingHorizontal: 24, paddingBottom: 14 },
  progressLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
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
  questionText: { color: colors.text, fontSize: 16, fontWeight: '700', lineHeight: 23 },
  questionHint: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },

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
  optionText: { color: colors.text, flex: 1, fontSize: 14, fontWeight: '500', lineHeight: 19 },
  optionTextActive: { fontWeight: '700' },

  emptyCard: { alignItems: 'center', flex: 1, gap: 8, justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },

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
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
})
