import { DISEASE_LABELS } from '../constants/diseases'
import type { DiseaseType, Prediction } from '../types/ai.types'
import { hasInformativeAnswers, refineQuestionnaireOnly } from './bayesian'
import type {
  AnswerReviewRow,
  AnswerReviewSelection,
  Answers,
  BayesianRefinementResult,
  DecisionQuestion,
  Knowledge,
  ParsedScreeningSummary,
  ScreeningSummaryMode,
  ScreeningSummaryPayload,
} from './types'

export const SUMMARY_VERSION = 1 as const
export const SUMMARY_METHOD = 'bayesian-provisional-v1' as const

const DISEASES = Object.keys(DISEASE_LABELS) as DiseaseType[]
const DISEASE_CODES = new Set<string>(DISEASES)

interface ParsedAnswers {
  answers: Answers
  invalidQuestionIds: string[]
  answersObjectValid: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isDiseaseType(value: unknown): value is DiseaseType {
  return typeof value === 'string' && DISEASE_CODES.has(value)
}

function parseScore(value: unknown): number | null {
  if (typeof value !== 'number') return null
  if (!Number.isFinite(value)) return null
  if (value < 0 || value > 100) return null
  return value
}

export function parsePredictionMode(value: unknown): Prediction[] | null {
  if (!Array.isArray(value)) return null
  if (value.length !== DISEASES.length) return null

  const seen = new Set<DiseaseType>()
  const predictions: Prediction[] = []

  for (const item of value) {
    if (!isRecord(item)) return null

    const disease = item.disease
    if (!isDiseaseType(disease)) return null
    if (seen.has(disease)) return null

    const confidence = parseScore(item.confidence)
    if (confidence === null) return null

    seen.add(disease)
    predictions.push({
      disease,
      confidence,
      label: DISEASE_LABELS[disease],
    })
  }

  if (seen.size !== DISEASES.length) return null

  return predictions.sort((a, b) => b.confidence - a.confidence)
}

function parseSelectedOptions(question: DecisionQuestion, value: unknown): string[] | null {
  if (!Array.isArray(value)) return null

  const optionIds = new Set(question.options.map((option) => option.id))
  const seen = new Set<string>()
  const selected: string[] = []

  for (const item of value) {
    if (typeof item !== 'string') return null
    if (!optionIds.has(item)) return null
    if (seen.has(item)) continue

    seen.add(item)
    selected.push(item)
  }

  if (!question.multi && selected.length > 1) return null

  return selected
}

function parseAnswers(value: unknown, knowledge: Knowledge): ParsedAnswers {
  const answers: Answers = {}
  const invalidQuestionIds: string[] = []

  if (!isRecord(value)) {
    return { answers, invalidQuestionIds, answersObjectValid: false }
  }

  for (const question of knowledge.questions) {
    if (!Object.prototype.hasOwnProperty.call(value, question.id)) continue

    const selected = parseSelectedOptions(question, value[question.id])
    if (selected === null) {
      invalidQuestionIds.push(question.id)
      continue
    }

    if (selected.length > 0) {
      answers[question.id] = selected
    }
  }

  return { answers, invalidQuestionIds, answersObjectValid: true }
}

function parseAskedQuestionIds(value: unknown, knowledge: Knowledge): string[] {
  if (!Array.isArray(value)) return []

  const validIds = new Set(knowledge.questions.map((question) => question.id))
  const seen = new Set<string>()
  const askedQuestionIds: string[] = []

  for (const item of value) {
    if (typeof item !== 'string') continue
    if (!validIds.has(item)) continue
    if (seen.has(item)) continue

    seen.add(item)
    askedQuestionIds.push(item)
  }

  return askedQuestionIds
}

export function buildAnswerReview(
  answers: Answers,
  askedQuestionIds: readonly string[],
  knowledge: Knowledge,
  invalidQuestionIds: readonly string[] = [],
): AnswerReviewRow[] {
  const asked = new Set(askedQuestionIds)
  const invalid = new Set(invalidQuestionIds)

  return knowledge.questions.map((question, index) => {
    const optionById = new Map(question.options.map((option) => [option.id, option]))
    const selectedIds = answers[question.id] ?? []
    const selected: AnswerReviewSelection[] = []
    let hasUnknownOption = false

    for (const id of selectedIds) {
      const option = optionById.get(id)
      if (!option) {
        hasUnknownOption = true
        continue
      }
      selected.push({ id: option.id, label: option.label })
    }

    const invalidSelection = hasUnknownOption || (!question.multi && selectedIds.length > 1)
    const isAsked = asked.has(question.id) || selectedIds.length > 0

    if (invalid.has(question.id) || invalidSelection) {
      return {
        questionId: question.id,
        questionNumber: index + 1,
        text: question.text,
        multi: question.multi === true,
        status: 'invalid',
        selected: [],
      }
    }

    if (selected.length > 0) {
      return {
        questionId: question.id,
        questionNumber: index + 1,
        text: question.text,
        multi: question.multi === true,
        status: 'answered',
        selected,
      }
    }

    return {
      questionId: question.id,
      questionNumber: index + 1,
      text: question.text,
      multi: question.multi === true,
      status: isAsked ? 'not-answered' : 'not-asked',
      selected: [],
    }
  })
}

export function parseScreeningSummary(
  raw: string | null | undefined,
  knowledge: Knowledge,
): ParsedScreeningSummary | null {
  if (typeof raw !== 'string' || raw.trim().length === 0) return null

  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }

  if (!isRecord(value)) return null
  if (value.version !== SUMMARY_VERSION) return null
  if (value.method !== SUMMARY_METHOD) return null

  const invalidModes: ScreeningSummaryMode[] = []

  const parseMode = (key: string, mode: ScreeningSummaryMode): Prediction[] | null => {
    const rawMode = value[key]
    if (rawMode === undefined || rawMode === null) return null

    const parsed = parsePredictionMode(rawMode)
    if (!parsed) invalidModes.push(mode)
    return parsed
  }

  const aiOnly = parseMode('aiOnly', 'ai-only')
  let questionnaireOnly = parseMode('questionnaireOnly', 'questionnaire-only')
  const combined = parseMode('combined', 'combined')

  const parsedAnswers = parseAnswers(value.answers, knowledge)
  const askedQuestionIds = parseAskedQuestionIds(value.askedQuestionIds, knowledge)
  const informative = hasInformativeAnswers(parsedAnswers.answers, knowledge)

  if (!informative) {
    questionnaireOnly = null
    const questionnaireIndex = invalidModes.indexOf('questionnaire-only')
    if (questionnaireIndex >= 0) invalidModes.splice(questionnaireIndex, 1)
  }

  return {
    aiOnly,
    questionnaireOnly,
    combined,
    answers: parsedAnswers.answers,
    askedQuestionIds,
    answerReview: buildAnswerReview(
      parsedAnswers.answers,
      askedQuestionIds,
      knowledge,
      parsedAnswers.invalidQuestionIds,
    ),
    answersValid: parsedAnswers.answersObjectValid,
    hasInformativeAnswers: informative,
    invalidModes,
    invalidAnswerQuestionIds: parsedAnswers.invalidQuestionIds,
  }
}

export function buildScreeningSummary(
  predictions: Prediction[],
  answers: Answers,
  askedQuestionIds: readonly string[],
  refined: BayesianRefinementResult,
  knowledge: Knowledge,
): ScreeningSummaryPayload {
  const parsedAnswers = parseAnswers(answers, knowledge)

  return {
    version: SUMMARY_VERSION,
    method: SUMMARY_METHOD,
    aiOnly: parsePredictionMode(predictions),
    questionnaireOnly: refineQuestionnaireOnly(parsedAnswers.answers, knowledge),
    combined: parsePredictionMode(refined.refined),
    answers: parsedAnswers.answers,
    askedQuestionIds: parseAskedQuestionIds(askedQuestionIds, knowledge),
  }
}
