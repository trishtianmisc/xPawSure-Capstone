import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import {
  Image,
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

const DISEASE_COLORS: Record<string, string> = {
  ALLERGIC_DERMATITIS: '#E67E22',
  BACTERIAL: '#C0392B',
  FUNGAL: '#8E44AD',
  HOTSPOT: '#D35400',
  MANGE: '#27AE60',
}

export default function AdjustScreen() {
  const router = useRouter()
  const { colors, isDark } = useTheme()
  const params = useLocalSearchParams<{
    predictions: string
    petId: string
    petName: string
    imageUri?: string
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
  const [done, setDone] = useState(false)

  const hasResult = predictions.length > 0
  const result = useMemo(
    () => (done && hasResult ? refinePredictions(predictions, answers, KNOWLEDGE) : null),
    [done, hasResult, predictions, answers],
  )

  const question = questions[step]
  const selected = answers[question.id] ?? []
  const isLast = step === total - 1

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

  const goNext = () => {
    if (!isLast) {
      setStep(step + 1)
    } else {
      setDone(true)
    }
  }

  const goBack = () => {
    if (done) {
      router.back()
      return
    }
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
      <Text style={styles.headerTitle}>Narrow It Down</Text>
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

  if (done && result) {
    const top3 = result.refined.slice(0, 3)
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={styles.safeArea.backgroundColor} />
        {header}

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.imageRow}>
            {params.imageUri ? (
              <Image source={{ uri: params.imageUri }} style={styles.thumbnail} />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <MaterialCommunityIcons color={colors.iconColor} name="paw" size={20} />
              </View>
            )}
            <View style={styles.imageInfo}>
              <Text style={styles.petName}>{params.petName}</Text>
              <Text style={styles.timestamp}>Based on your answers</Text>
            </View>
          </View>

          <View
            style={[
              styles.verdictCard,
              { borderColor: (result.changed ? colors.primary : DISEASE_COLORS[result.refinedTop.disease]) + '30' },
            ]}
          >
            <MaterialCommunityIcons
              color={result.changed ? colors.primary : DISEASE_COLORS[result.refinedTop.disease]}
              name={result.changed ? 'swap-horizontal' : 'check-circle-outline'}
              size={22}
            />
            <Text style={styles.verdictText}>
              {result.changed ? (
                <>
                  Your answers point to{' '}
                  <Text style={{ fontWeight: '800' }}>{result.refinedTop.label}</Text> instead of the AI&rsquo;s{' '}
                  <Text style={{ fontWeight: '800' }}>{result.originalTop.label}</Text>.
                </>
              ) : (
                <>
                  Your answers are consistent with the AI&rsquo;s suggestion of{' '}
                  <Text style={{ fontWeight: '800' }}>{result.originalTop.label}</Text>.
                </>
              )}
            </Text>
          </View>

          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownTitle}>Refined Suggestions</Text>
            {top3.map((pred, i) => {
              const pct = Math.round(pred.confidence)
              const color = DISEASE_COLORS[pred.disease] ?? colors.primary
              return (
                <View key={pred.disease} style={styles.barRow}>
                  <View style={styles.barLabelRow}>
                    <Text style={[styles.barLabel, i === 0 && { color: colors.text }]} numberOfLines={1}>
                      {i === 0 ? '\u2605 ' : '  '}
                      {pred.label}
                    </Text>
                    <Text style={[styles.barPct, i === 0 && { color: colors.text, fontWeight: '700' }]}>{pct}%</Text>
                  </View>
                  <View style={[styles.barTrack, { backgroundColor: colors.surfaceAlt }]}>
                    <View
                      style={[
                        styles.barFill,
                        { backgroundColor: i === 0 ? color : colors.border, width: `${pct}%` },
                      ]}
                    />
                  </View>
                </View>
              )
            })}
          </View>

          <View style={[styles.infoCard, { backgroundColor: colors.surfaceAlt }]}>
            <MaterialCommunityIcons color={colors.textMuted} name="information-outline" size={16} />
            <Text style={styles.infoText}>
              This refinement is an AI-assisted screening aid based on your answers and does not replace
              professional veterinary diagnosis. Consult a vet for definitive results.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <Pressable onPress={goBack} style={[styles.actionBtn, styles.secondaryBtn, { borderColor: colors.border }]}>
            <MaterialCommunityIcons color={colors.primary} name="arrow-left" size={16} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Back to Result</Text>
          </Pressable>
          <Pressable onPress={() => router.dismissTo('/(owner)')} style={[styles.actionBtn, styles.primaryBtn]}>
            <MaterialCommunityIcons color="#FFF" name="home" size={16} />
            <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Home</Text>
          </Pressable>
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
          onPress={() => {
            setAnswers((prev) => ({ ...prev, [question.id]: [] }))
            goNext()
          }}
          style={[styles.actionBtn, styles.secondaryBtn, { borderColor: colors.border }]}
        >
          <Text style={[styles.actionBtnText, { color: colors.textMuted }]}>Skip</Text>
        </Pressable>
        <Pressable onPress={goNext} style={[styles.actionBtn, styles.primaryBtn]}>
          <Text style={[styles.actionBtnText, { color: '#FFF' }]}>{isLast ? 'See Suggestions' : 'Next'}</Text>
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
  petName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  timestamp: { color: colors.textMuted, fontSize: 12, marginTop: 2 },

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
  verdictText: { color: colors.text, flex: 1, fontSize: 13, lineHeight: 19 },

  breakdownCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    padding: 18,
  },
  breakdownTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 16 },
  barRow: { gap: 6, marginBottom: 14 },
  barLabelRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  barLabel: { color: '#A0A0A0', flex: 1, fontSize: 13, fontWeight: '500' },
  barPct: { color: '#A0A0A0', fontSize: 13, fontWeight: '600', marginLeft: 8, minWidth: 36, textAlign: 'right' },
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
  infoText: { color: colors.textMuted, flex: 1, fontSize: 12, lineHeight: 17 },

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
  secondaryBtn: { backgroundColor: colors.surface, borderWidth: 1.5 },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
})
