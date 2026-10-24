import { DISEASE_LABELS } from '../constants/diseases'
import type { DiseaseType, Prediction } from '../types/ai.types'
import {
  MAX_EXPERT_LOG_ODDS,
  PROVISIONAL_VOTE_LOG_SCALE,
  QUESTION_GROUPS,
} from './bayesian.config'
import type {
  Answers,
  BayesianRefinementResult,
  DecisionOption,
  DecisionQuestion,
  Knowledge,
} from './types'

const DISEASES = Object.keys(DISEASE_LABELS) as DiseaseType[]
const IMAGE_PROBABILITY_FLOOR = 1e-9

function zeroVector(): Record<DiseaseType, number> {
  const vector = {} as Record<DiseaseType, number>
  for (const disease of DISEASES) {
    vector[disease] = 0
  }
  return vector
}

function softmax(logits: Record<DiseaseType, number>, scale: number): Record<DiseaseType, number> {
  const scaled = zeroVector()
  let max = -Infinity

  for (const disease of DISEASES) {
    scaled[disease] = logits[disease] / scale
    max = Math.max(max, scaled[disease])
  }

  const probabilities = zeroVector()
  let total = 0
  for (const disease of DISEASES) {
    const value = Math.exp(scaled[disease] - max)
    probabilities[disease] = value
    total += value
  }

  for (const disease of DISEASES) {
    probabilities[disease] /= total
  }
  return probabilities
}

export function isInformativeOption(option: DecisionOption): boolean {
  return Object.values(option.votes).some((vote) => (vote ?? 0) !== 0)
}

export function hasInformativeAnswers(answers: Answers, knowledge: Knowledge): boolean {
  return knowledge.questions.some((question) => {
    const selected = answers[question.id]
    if (!selected || selected.length === 0) return false
    return question.options.some(
      (option) => selected.includes(option.id) && isInformativeOption(option),
    )
  })
}

export function getQuestionLikelihoods(
  question: DecisionQuestion,
): Record<DiseaseType, Record<string, number>> {
  const result = {} as Record<DiseaseType, Record<string, number>>

  for (const disease of DISEASES) {
    const scaled = question.options.map((option) => (option.votes[disease] ?? 0) / PROVISIONAL_VOTE_LOG_SCALE)
    const max = Math.max(...scaled)
    const weights = scaled.map((value) => Math.exp(value - max))
    const total = weights.reduce((sum, value) => sum + value, 0)

    result[disease] = {}
    question.options.forEach((option, index) => {
      result[disease][option.id] = weights[index] / total
    })
  }

  return result
}

function questionLogLikelihood(
  question: DecisionQuestion,
  selected: string[] | undefined,
): Record<DiseaseType, number> | null {
  if (!selected || selected.length === 0) return null

  const selectedOptions = question.options.filter(
    (option) => selected.includes(option.id) && isInformativeOption(option),
  )
  if (selectedOptions.length === 0) return null

  const likelihoods = getQuestionLikelihoods(question)
  const result = zeroVector()
  for (const option of selectedOptions) {
    for (const disease of DISEASES) {
      result[disease] += Math.log(likelihoods[disease][option.id])
    }
  }

  for (const disease of DISEASES) {
    result[disease] /= selectedOptions.length
  }
  return result
}

export function getQuestionGroups(knowledge: Knowledge): DecisionQuestion[][] {
  const groupedIds = new Set(QUESTION_GROUPS.flat())
  const groups = QUESTION_GROUPS.map((ids) =>
    knowledge.questions.filter((question) => ids.includes(question.id)),
  ).filter((group) => group.length > 0)

  const ungrouped = knowledge.questions
    .filter((question) => !groupedIds.has(question.id))
    .map((question) => [question])

  return [...groups, ...ungrouped]
}

function expertEvidence(answers: Answers, knowledge: Knowledge): Record<DiseaseType, number> {
  const evidence = zeroVector()

  for (const group of getQuestionGroups(knowledge)) {
    const groupEvidence: Record<DiseaseType, number>[] = []

    for (const question of group) {
      const logLikelihood = questionLogLikelihood(question, answers[question.id])
      if (logLikelihood) groupEvidence.push(logLikelihood)
    }

    if (groupEvidence.length === 0) continue

    for (const disease of DISEASES) {
      const average = groupEvidence.reduce((sum, value) => sum + value[disease], 0) / groupEvidence.length
      evidence[disease] += average
    }
  }

  const mean = DISEASES.reduce((sum, disease) => sum + evidence[disease], 0) / DISEASES.length
  for (const disease of DISEASES) {
    evidence[disease] -= mean
  }

  const maxAbs = Math.max(...DISEASES.map((disease) => Math.abs(evidence[disease])))
  if (maxAbs > MAX_EXPERT_LOG_ODDS) {
    const scale = MAX_EXPERT_LOG_ODDS / maxAbs
    for (const disease of DISEASES) {
      evidence[disease] *= scale
    }
  }

  return evidence
}

function normalizedImageProbabilities(predictions: Prediction[]): Record<DiseaseType, number> {
  const probabilities = zeroVector()

  for (const prediction of predictions) {
    if (!DISEASES.includes(prediction.disease)) continue
    probabilities[prediction.disease] = Math.min(100, Math.max(0, prediction.confidence)) / 100
  }

  const total = DISEASES.reduce((sum, disease) => sum + probabilities[disease], 0)
  if (total <= 0) {
    for (const disease of DISEASES) {
      probabilities[disease] = 1 / DISEASES.length
    }
    return probabilities
  }

  for (const disease of DISEASES) {
    probabilities[disease] /= total
  }
  return probabilities
}

export function refinePredictionsBayesian(
  predictions: Prediction[],
  answers: Answers,
  knowledge: Knowledge,
): BayesianRefinementResult {
  if (predictions.length === 0) {
    throw new Error('At least one image prediction is required')
  }

  const imageProbabilities = normalizedImageProbabilities(predictions)
  const expertLogOdds = expertEvidence(answers, knowledge)

  const logWeights = zeroVector()
  for (const disease of DISEASES) {
    logWeights[disease] = Math.log(Math.max(imageProbabilities[disease], IMAGE_PROBABILITY_FLOOR))
      + expertLogOdds[disease]
  }
  const posterior = softmax(logWeights, 1)

  const refined: Prediction[] = DISEASES.map((disease) => ({
    disease,
    confidence: Math.round(posterior[disease] * 10000) / 100,
    label: DISEASE_LABELS[disease],
  })).sort((a, b) => b.confidence - a.confidence)

  const originalTop = [...predictions].sort((a, b) => b.confidence - a.confidence)[0]
  const refinedTop = refined[0]

  return {
    method: 'bayesian-provisional-v1',
    refined,
    originalTop,
    refinedTop,
    changed: originalTop.disease !== refinedTop.disease,
    imageProbabilities,
    expertLogOdds,
    posterior,
  }
}

export function refineQuestionnaireOnly(
  answers: Answers,
  knowledge: Knowledge,
): Prediction[] | null {
  if (!hasInformativeAnswers(answers, knowledge)) return null

  const posterior = softmax(expertEvidence(answers, knowledge), 1)

  return DISEASES.map((disease) => ({
    disease,
    confidence: Math.round(posterior[disease] * 10000) / 100,
    label: DISEASE_LABELS[disease],
  })).sort((a, b) => b.confidence - a.confidence)
}
