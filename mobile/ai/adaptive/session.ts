import type { DiseaseType, Prediction } from '../types/ai.types.ts'
import type { Answers, Knowledge } from '../decisionTree/types.ts'
import { DISEASES } from './types.ts'
import type {
  AdaptiveConfig,
  AdaptiveEvidenceSummary,
  AdaptiveResultPayload,
  AdaptiveSession,
  ApplicabilityRules,
  AnsweredQuestion,
  LikelihoodProfile,
  OutcomeBasis,
  ProbabilityDistribution,
  StopReason,
  StoppingRuleValidation,
} from './types.ts'
import {
  argmaxDisease,
  bayesUpdate,
  entropyBits,
  normalizeDistribution,
  realizedInformationGain,
  smoothDistribution,
  topTwo,
} from './math.ts'
import {
  observedMultiSelectLikelihoods,
  observedSingleChoiceLikelihoods,
} from './likelihoods.ts'
import { combinedEvidenceWeight } from './redundancy.ts'
import { resolveStrategy, selectNextQuestion } from './selector.ts'

export type DiseaseLabels = Record<DiseaseType, string>

function clonePredictions(predictions: Prediction[]): Prediction[] {
  return predictions.map((prediction) => ({ ...prediction }))
}

/**
 * Convert image-model percentages into a distribution over the five classes.
 * Missing classes receive zero mass. The raw distribution is retained
 * separately from the smoothed prior so callers can always inspect what the
 * image model actually produced.
 */
export function imageDistributionFromPredictions(
  predictions: Prediction[],
): ProbabilityDistribution {
  const values = normalizeDistribution({}, 0)
  for (const disease of DISEASES) values[disease] = 0

  for (const prediction of predictions) {
    if (!DISEASES.includes(prediction.disease)) continue
    const confidence = prediction.confidence
    if (typeof confidence !== 'number' || !Number.isFinite(confidence)) continue
    const probability = Math.min(100, Math.max(0, confidence)) / 100
    values[prediction.disease] = Math.max(values[prediction.disease], probability)
  }

  return normalizeDistribution(values)
}

/**
 * Stable key for resuming the questionnaire after navigation or an interrupted
 * answer. It intentionally changes when a new image screening produces a
 * different distribution.
 */
export function createSessionKey(
  petId: string,
  predictions: Prediction[],
  modelVersion: string,
): string {
  const stablePredictions = [...predictions]
    .map((prediction) => [
      prediction.disease,
      Math.round((Number.isFinite(prediction.confidence) ? prediction.confidence : 0) * 100) / 100,
    ])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))

  const input = JSON.stringify({
    petId,
    modelVersion: modelVersion || 'unknown',
    predictions: stablePredictions,
  })

  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }

  return `adaptive-v1-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

function stoppingRuleMeta(config: AdaptiveConfig): {
  id: string
  validation: StoppingRuleValidation
} {
  if (config.validatedStoppingCriterion) {
    return {
      id: config.validatedStoppingCriterion.id,
      validation: 'validated',
    }
  }
  return {
    id: 'operational-defaults-v1',
    validation: 'unvalidated_operational',
  }
}

interface OutcomeFields {
  outcome: AdaptiveSession['outcome']
  outcomeBasis: OutcomeBasis | null
  stopReason: StopReason | null
}

function finalizeOutcome(
  session: Pick<
    AdaptiveSession,
    'strategy' | 'posterior' | 'questionCount' | 'imagePredictions' | 'stopReason'
  >,
  config: AdaptiveConfig,
): OutcomeFields {
  if (session.strategy === 'fixed_order') {
    return {
      outcome: null,
      outcomeBasis: null,
      stopReason: session.stopReason,
    }
  }

  // With no answered questions the image model result is preserved exactly as
  // the existing workflow presented it. This is not a questionnaire-selected
  // label; it is explicitly marked as image-only.
  if (session.questionCount === 0) {
    const hasImageResult = session.imagePredictions.length > 0
    return {
      outcome: hasImageResult ? 'DISEASE_DETECTED' : 'UNCERTAIN',
      outcomeBasis: hasImageResult ? 'image_only' : null,
      stopReason: hasImageResult
        ? session.stopReason ?? 'no_meaningful_question'
        : 'insufficient_evidence',
    }
  }

  const criterion = config.validatedStoppingCriterion
  const minTop = criterion?.minTopProbability ?? config.uncertaintyTopProbability
  const minMargin = criterion?.minMargin ?? config.uncertaintyMargin
  const maxEntropy = criterion?.maxEntropy ?? config.uncertaintyEntropy

  const { topProbability, secondProbability } = topTwo(session.posterior)
  const margin = topProbability - secondProbability
  const entropy = entropyBits(session.posterior)

  if (topProbability < minTop || entropy > maxEntropy) {
    return {
      outcome: 'UNCERTAIN',
      outcomeBasis: null,
      stopReason: 'insufficient_evidence',
    }
  }

  if (margin < minMargin) {
    return {
      outcome: 'UNCERTAIN',
      outcomeBasis: null,
      stopReason: 'conflicting_evidence',
    }
  }

  return {
    outcome: 'DISEASE_DETECTED',
    outcomeBasis: 'adaptive',
    stopReason: session.stopReason ?? 'all_questions_answered',
  }
}

export interface CreateAdaptiveSessionParams {
  predictions: Prediction[]
  knowledge: Knowledge
  profile: LikelihoodProfile | null
  config: AdaptiveConfig
  sessionKey: string
  applicability?: ApplicabilityRules
  now?: string
}

export function createAdaptiveSession(params: CreateAdaptiveSessionParams): AdaptiveSession {
  const now = params.now ?? new Date().toISOString()
  const imageDistribution = imageDistributionFromPredictions(params.predictions)
  const prior = smoothDistribution(imageDistribution, params.config.priorSmoothing)
  const strategy = resolveStrategy(params.config, params.profile)
  const stopping = stoppingRuleMeta(params.config)

  const base: AdaptiveSession = {
    schemaVersion: 1,
    sessionKey: params.sessionKey,
    profileId: params.profile?.id ?? 'none',
    profileValidation: params.profile?.validation ?? 'missing',
    strategy,
    stoppingRuleId: stopping.id,
    stoppingRuleValidation: stopping.validation,
    createdAt: now,
    updatedAt: now,
    imagePredictions: clonePredictions(params.predictions),
    imageDistribution,
    prior,
    posterior: prior,
    answers: {},
    answeredQuestions: [],
    currentQuestionId: null,
    questionCount: 0,
    stopReason: null,
    outcome: null,
    outcomeBasis: null,
    entropyBits: entropyBits(prior),
  }

  const selection = selectNextQuestion({
    knowledge: params.knowledge,
    answers: base.answers,
    prior: base.posterior,
    profile: params.profile,
    config: params.config,
    questionCount: 0,
    applicability: params.applicability,
  })

  if (selection.question) {
    return {
      ...base,
      currentQuestionId: selection.question.id,
    }
  }

  const outcome = finalizeOutcome(
    {
      ...base,
      stopReason: selection.stopReason ?? 'all_questions_answered',
    },
    params.config,
  )

  return {
    ...base,
    ...outcome,
  }
}

export interface AnswerQuestionParams {
  knowledge: Knowledge
  profile: LikelihoodProfile | null
  config: AdaptiveConfig
  applicability?: ApplicabilityRules
  now?: string
}

function validateSelection(
  questionId: string,
  optionIds: string[],
  knowledge: Knowledge,
  answers: Answers,
): string[] {
  if ((answers[questionId]?.length ?? 0) > 0) {
    throw new Error(`Question ${questionId} has already been answered`)
  }

  const question = knowledge.questions.find((candidate) => candidate.id === questionId)
  if (!question) throw new Error(`Unknown question ${questionId}`)

  if (optionIds.length === 0) {
    throw new Error('At least one answer option is required')
  }

  const unique = Array.from(new Set(optionIds))
  if (unique.length !== optionIds.length) {
    throw new Error('Duplicate answer options are not allowed')
  }

  if (!question.multi && unique.length !== 1) {
    throw new Error(`Question ${questionId} accepts exactly one option`)
  }

  const validIds = new Set(question.options.map((option) => option.id))
  for (const optionId of unique) {
    if (!validIds.has(optionId)) {
      throw new Error(`Unknown option ${optionId} for question ${questionId}`)
    }
  }

  return unique
}

/**
 * Apply one answer and select the next question. The original image
 * predictions and image distribution are never modified.
 */
export function answerQuestion(
  session: AdaptiveSession,
  questionId: string,
  optionIds: string[],
  params: AnswerQuestionParams,
): AdaptiveSession {
  if (session.currentQuestionId !== questionId) {
    throw new Error(
      `Question ${questionId} is not the current question (${String(session.currentQuestionId)})`,
    )
  }

  const question = params.knowledge.questions.find((candidate) => candidate.id === questionId)
  if (!question) throw new Error(`Unknown question ${questionId}`)

  const selected = validateSelection(questionId, optionIds, params.knowledge, session.answers)
  const weight = combinedEvidenceWeight(
    questionId,
    session.answers,
    params.knowledge,
    params.config,
  )

  let posterior = session.posterior
  if (params.profile) {
    const likelihoods = question.multi
      ? observedMultiSelectLikelihoods(
          question,
          selected,
          params.profile,
          weight.combined,
        )
      : observedSingleChoiceLikelihoods(
          question,
          selected[0],
          params.profile,
          weight.combined,
        )

    posterior = bayesUpdate(
      session.posterior,
      likelihoods,
      params.config.probabilityFloor,
    ).posterior
  }

  const entropyBefore = entropyBits(session.posterior)
  const entropyAfter = entropyBits(posterior)
  const topBefore = argmaxDisease(session.posterior)
  const topAfter = argmaxDisease(posterior)

  const answered: AnsweredQuestion = {
    questionId,
    questionText: question.text,
    evidenceGroup: params.profile?.questions[questionId]?.evidenceGroup ?? 'other',
    optionIds: selected,
    optionLabels: selected.map((optionId) => {
      const option = question.options.find((candidate) => candidate.id === optionId)
      return option?.label ?? optionId
    }),
    multi: question.multi === true,
    entropyBefore,
    entropyAfter,
    realizedInformationGain: realizedInformationGain(session.posterior, posterior),
    redundancyWeight: weight.redundancy,
    topBefore,
    topAfter,
  }

  const answers: Answers = {
    ...session.answers,
    [questionId]: selected,
  }
  const questionCount = session.questionCount + 1

  const selection = selectNextQuestion({
    knowledge: params.knowledge,
    answers,
    prior: posterior,
    profile: params.profile,
    config: params.config,
    questionCount,
    applicability: params.applicability,
  })

  const updated: AdaptiveSession = {
    ...session,
    updatedAt: params.now ?? new Date().toISOString(),
    posterior,
    answers,
    answeredQuestions: [...session.answeredQuestions, answered],
    questionCount,
    currentQuestionId: selection.question?.id ?? null,
    stopReason: selection.stopReason,
    outcome: null,
    outcomeBasis: null,
    entropyBits: entropyAfter,
  }

  if (selection.question) {
    return updated
  }

  return {
    ...updated,
    ...finalizeOutcome(updated, params.config),
  }
}

export function isExperimentalSession(session: AdaptiveSession): boolean {
  return session.strategy === 'information_gain' && session.profileValidation !== 'validated'
}

export function isSessionComplete(session: AdaptiveSession): boolean {
  return session.currentQuestionId === null
}

export function posteriorToPredictions(
  posterior: ProbabilityDistribution,
  labels: DiseaseLabels,
): Prediction[] {
  return DISEASES.map((disease) => ({
    disease,
    confidence: Math.round((posterior[disease] ?? 0) * 10000) / 100,
    label: labels[disease],
  })).sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence
    return DISEASES.indexOf(a.disease) - DISEASES.indexOf(b.disease)
  })
}

export function buildAdaptiveResultPayload(
  session: AdaptiveSession,
  labels: DiseaseLabels,
): AdaptiveResultPayload {
  const predictions = posteriorToPredictions(session.posterior, labels)
  const evidence: AdaptiveEvidenceSummary[] = session.answeredQuestions.map((answer) => ({
    questionId: answer.questionId,
    optionIds: [...answer.optionIds],
    optionLabels: [...answer.optionLabels],
    realizedInformationGain: answer.realizedInformationGain,
  }))

  return {
    schemaVersion: 1,
    strategy: session.strategy,
    state: session.outcome ?? 'DISEASE_DETECTED',
    predictions,
    posterior: { ...session.posterior },
    imagePredictions: clonePredictions(session.imagePredictions),
    imageDistribution: { ...session.imageDistribution },
    top: predictions[0] ?? null,
    stopReason: session.stopReason,
    questionCount: session.questionCount,
    profileId: session.profileId,
    profileValidation: session.profileValidation,
    stoppingRuleId: session.stoppingRuleId,
    stoppingRuleValidation: session.stoppingRuleValidation,
    entropyBits: session.entropyBits,
    evidence,
  }
}

export function serializeSession(session: AdaptiveSession): string {
  return JSON.stringify(session)
}

function isDistribution(value: unknown): value is ProbabilityDistribution {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  let sum = 0
  for (const disease of DISEASES) {
    const probability = record[disease]
    if (typeof probability !== 'number' || !Number.isFinite(probability) || probability < 0) {
      return false
    }
    sum += probability
  }
  return Math.abs(sum - 1) <= 1e-6
}

function isPredictionArray(value: unknown): value is Prediction[] {
  if (!Array.isArray(value)) return false
  return value.every((item) => {
    if (!item || typeof item !== 'object') return false
    const prediction = item as Record<string, unknown>
    return (
      typeof prediction.disease === 'string' &&
      DISEASES.includes(prediction.disease as DiseaseType) &&
      typeof prediction.confidence === 'number' &&
      Number.isFinite(prediction.confidence) &&
      prediction.confidence >= 0 &&
      prediction.confidence <= 100 &&
      typeof prediction.label === 'string'
    )
  })
}

function isAnswers(value: unknown): value is Answers {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.values(value as Record<string, unknown>).every(
    (entry) => Array.isArray(entry) && entry.every((item) => typeof item === 'string'),
  )
}

/**
 * Validate a persisted session before resuming. A corrupt or stale session
 * returns null so the caller can start a fresh questionnaire.
 */
export function deserializeSession(raw: string | null): AdaptiveSession | null {
  if (!raw) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (!parsed || typeof parsed !== 'object') return null
  const session = parsed as Record<string, unknown>

  if (session.schemaVersion !== 1) return null
  if (typeof session.sessionKey !== 'string' || session.sessionKey.length === 0) return null
  if (typeof session.profileId !== 'string') return null
  if (session.strategy !== 'information_gain' && session.strategy !== 'fixed_order') return null

  if (
    session.profileValidation !== 'validated' &&
    session.profileValidation !== 'unvalidated_expert_heuristic' &&
    session.profileValidation !== 'synthetic_test_only' &&
    session.profileValidation !== 'missing'
  ) {
    return null
  }

  if (
    session.stoppingRuleValidation !== 'validated' &&
    session.stoppingRuleValidation !== 'unvalidated_operational'
  ) {
    return null
  }

  if (!isPredictionArray(session.imagePredictions)) return null
  if (!isDistribution(session.imageDistribution)) return null
  if (!isDistribution(session.prior)) return null
  if (!isDistribution(session.posterior)) return null
  if (!isAnswers(session.answers)) return null
  if (!Array.isArray(session.answeredQuestions)) return null

  if (session.currentQuestionId !== null && typeof session.currentQuestionId !== 'string') {
    return null
  }
  if (
    typeof session.questionCount !== 'number' ||
    !Number.isInteger(session.questionCount) ||
    session.questionCount < 0
  ) {
    return null
  }
  if (session.stopReason !== null && typeof session.stopReason !== 'string') return null
  if (session.outcome !== null && session.outcome !== 'DISEASE_DETECTED' && session.outcome !== 'UNCERTAIN') {
    return null
  }
  if (
    session.outcomeBasis !== null &&
    session.outcomeBasis !== 'adaptive' &&
    session.outcomeBasis !== 'image_only' &&
    session.outcomeBasis !== 'rule_based'
  ) {
    return null
  }
  if (typeof session.entropyBits !== 'number' || !Number.isFinite(session.entropyBits)) return null
  if (typeof session.createdAt !== 'string' || typeof session.updatedAt !== 'string') return null

  return parsed as AdaptiveSession
}
