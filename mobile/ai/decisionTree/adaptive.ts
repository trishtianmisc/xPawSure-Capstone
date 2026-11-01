import type { DiseaseType, Prediction } from '../types/ai.types'
import {
  getQuestionGroups,
  getQuestionLikelihoods,
  isInformativeOption,
  refinePredictionsBayesian,
} from './bayesian'
import { ADAPTIVE_CONFIG } from './adaptive.config'
import type {
  AdaptiveAnswerState,
  AdaptiveConfig,
  Answers,
  DecisionQuestion,
  Knowledge,
  QuestionnaireMode,
  RefinementMethod,
  StoppingDecision,
  StoppingReason,
} from './types'

function questionMap(knowledge: Knowledge): Map<string, DecisionQuestion> {
  return new Map(knowledge.questions.map((question) => [question.id, question]))
}

function uniqueAnsweredIds(askedQuestionIds: readonly string[], knowledge: Knowledge): string[] {
  const validIds = new Set(knowledge.questions.map((question) => question.id))
  const seen = new Set<string>()

  return askedQuestionIds.filter((id) => {
    if (!validIds.has(id) || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

export function isInformativeAnswer(
  question: DecisionQuestion,
  selected: string[] | undefined,
): boolean {
  if (!selected || selected.length === 0) return false
  return question.options.some(
    (option) => selected.includes(option.id) && isInformativeOption(option),
  )
}

function informativeGroupCount(
  answers: Answers,
  askedIds: readonly string[],
  knowledge: Knowledge,
): number {
  const byId = questionMap(knowledge)
  const groups = getQuestionGroups(knowledge)
  const groupByQuestion = new Map<string, number>()

  groups.forEach((group, index) => {
    for (const question of group) {
      groupByQuestion.set(question.id, index)
    }
  })

  const distinct = new Set<number>()
  for (const id of askedIds) {
    const question = byId.get(id)
    if (!question || !isInformativeAnswer(question, answers[id])) continue
    const group = groupByQuestion.get(id)
    if (group !== undefined) distinct.add(group)
  }
  return distinct.size
}

function stabilityState(
  predictions: Prediction[],
  answers: Answers,
  askedIds: readonly string[],
  knowledge: Knowledge,
): { leader: DiseaseType | null; updates: number } {
  const byId = questionMap(knowledge)
  let previousLeader: DiseaseType | null = null
  let updates = 0

  for (let index = 0; index < askedIds.length; index += 1) {
    const id = askedIds[index]
    const question = byId.get(id)
    if (!question || !isInformativeAnswer(question, answers[id])) continue

    const prefixAnswers: Answers = {}
    for (let prefixIndex = 0; prefixIndex <= index; prefixIndex += 1) {
      const prefixId = askedIds[prefixIndex]
      if (answers[prefixId]) prefixAnswers[prefixId] = answers[prefixId]
    }

    const leader = refinePredictionsBayesian(predictions, prefixAnswers, knowledge).refinedTop.disease
    if (leader === previousLeader) {
      updates += 1
    } else {
      previousLeader = leader
      updates = 1
    }
  }

  return { leader: previousLeader, updates }
}

export function resolveQuestionnaireMode(
  refinementMethod: RefinementMethod,
  config: AdaptiveConfig = ADAPTIVE_CONFIG,
): QuestionnaireMode {
  const bayesian = refinementMethod === 'bayesian-provisional-v1'
  return {
    adaptiveOrdering: bayesian && config.adaptiveOrderingEnabled,
    earlyStopping: bayesian && config.earlyStoppingEnabled,
  }
}

export function questionDiscrimination(
  question: DecisionQuestion,
  leading: DiseaseType,
  runnerUp: DiseaseType,
): number {
  if (leading === runnerUp) return 0

  const likelihoods = getQuestionLikelihoods(question)
  let distance = 0
  for (const option of question.options) {
    distance += Math.abs(
      likelihoods[leading][option.id] - likelihoods[runnerUp][option.id],
    )
  }
  return distance / 2
}

export function selectNextQuestion(
  predictions: Prediction[],
  answers: Answers,
  askedQuestionIds: readonly string[],
  knowledge: Knowledge,
  mode: QuestionnaireMode,
): DecisionQuestion | null {
  const asked = new Set(uniqueAnsweredIds(askedQuestionIds, knowledge))
  const unanswered = knowledge.questions.filter((question) => !asked.has(question.id))
  if (unanswered.length === 0) return null
  if (!mode.adaptiveOrdering || predictions.length === 0) return unanswered[0]

  const refined = refinePredictionsBayesian(predictions, answers, knowledge).refined
  const leading = refined[0]
  const runnerUp = refined[1]
  if (!leading || !runnerUp) return unanswered[0]

  let best = unanswered[0]
  let bestScore = questionDiscrimination(best, leading.disease, runnerUp.disease)

  for (const question of unanswered.slice(1)) {
    const score = questionDiscrimination(question, leading.disease, runnerUp.disease)
    if (score > bestScore) {
      best = question
      bestScore = score
    }
  }

  return best
}

export function commitAdaptiveAnswer(
  state: AdaptiveAnswerState,
  questionId: string,
  selected: string[],
): AdaptiveAnswerState {
  const askedQuestionIds = state.askedQuestionIds.includes(questionId)
    ? [...state.askedQuestionIds]
    : [...state.askedQuestionIds, questionId]

  return {
    answers: { ...state.answers, [questionId]: [...selected] },
    askedQuestionIds,
  }
}

export function evaluateStopping(
  predictions: Prediction[],
  answers: Answers,
  askedQuestionIds: readonly string[],
  knowledge: Knowledge,
  config: AdaptiveConfig = ADAPTIVE_CONFIG,
  earlyStopping = config.earlyStoppingEnabled,
): StoppingDecision {
  const askedIds = uniqueAnsweredIds(askedQuestionIds, knowledge)
  const asked = new Set(askedIds)
  const allAnswered = knowledge.questions.every((question) => asked.has(question.id))
  const totalQuestions = knowledge.questions.length

  const base: StoppingDecision = {
    shouldStop: false,
    reason: null,
    answeredCount: askedIds.length,
    totalQuestions,
    leading: null,
    runnerUp: null,
    leadingProbability: 0,
    runnerUpProbability: 0,
    margin: 0,
    informativeGroups: informativeGroupCount(answers, askedIds, knowledge),
    stableInformativeUpdates: 0,
    criteria: {
      leadingPosterior: false,
      top2Margin: false,
      informativeGroups: false,
      stability: false,
    },
  }

  let decision = base

  if (predictions.length > 0) {
    const refined = refinePredictionsBayesian(predictions, answers, knowledge)
    const leading = refined.refined[0]
    const runnerUp = refined.refined[1]
    const stability = stabilityState(predictions, answers, askedIds, knowledge)
    const leadingProbability = leading ? refined.posterior[leading.disease] : 0
    const runnerUpProbability = runnerUp ? refined.posterior[runnerUp.disease] : 0
    const margin = leadingProbability - runnerUpProbability

    const criteria = {
      leadingPosterior: leadingProbability >= config.leadingPosteriorThreshold,
      top2Margin: margin >= config.minTop2Margin,
      informativeGroups: base.informativeGroups >= config.minInformativeGroups,
      stability: stability.updates >= config.stabilityInformativeUpdates,
    }

    decision = {
      ...base,
      leading: leading?.disease ?? null,
      runnerUp: runnerUp?.disease ?? null,
      leadingProbability,
      runnerUpProbability,
      margin,
      stableInformativeUpdates: stability.updates,
      criteria,
    }
  }

  const criteriaMet = Object.values(decision.criteria).every(Boolean)
  let reason: StoppingReason | null = null

  if (earlyStopping && criteriaMet) {
    reason = 'criteria-met'
  } else if (allAnswered) {
    reason = earlyStopping ? 'all-questions-answered' : 'completed-with-early-stopping-disabled'
  }

  return {
    ...decision,
    shouldStop: reason !== null,
    reason,
  }
}
