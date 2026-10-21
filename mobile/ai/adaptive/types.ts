import type { DiseaseType, Prediction } from '../types/ai.types.ts'
import type { Answers, DecisionQuestion } from '../decisionTree/types.ts'

/**
 * The five screening classes are fixed by the deployed model. They are listed
 * here in the same order as `DISEASE_LABELS` in `../constants/diseases.ts`.
 */
export const DISEASES = [
  'ALLERGIC_DERMATITIS',
  'BACTERIAL',
  'FUNGAL',
  'HOTSPOT',
  'MANGE',
] as const satisfies readonly DiseaseType[]

export type ProbabilityDistribution = Record<DiseaseType, number>
export type Likelihoods = Record<DiseaseType, number>

export type AdaptiveMode = 'adaptive' | 'rule_based' | 'auto'
export type QuestionnaireStrategy = 'information_gain' | 'fixed_order'

/**
 * `validated` is reserved for likelihoods derived from an independent,
 * veterinarian-confirmed dataset. The built-in profile is deliberately marked
 * as unvalidated because the repository contains only ordinal vet vote
 * weights, not symptom likelihoods.
 */
export type LikelihoodValidation =
  | 'validated'
  | 'unvalidated_expert_heuristic'
  | 'synthetic_test_only'
  | 'missing'

export type StoppingRuleValidation = 'validated' | 'unvalidated_operational'

export type StopReason =
  | 'max_questions'
  | 'no_meaningful_question'
  | 'all_questions_answered'
  | 'insufficient_evidence'
  | 'conflicting_evidence'
  | 'profile_unavailable'

export type AdaptiveOutcome = 'DISEASE_DETECTED' | 'UNCERTAIN'
export type OutcomeBasis = 'adaptive' | 'image_only' | 'rule_based'

export interface QuestionLikelihood {
  questionId: string
  multi: boolean
  evidenceGroup: string
  /**
   * Options such as "Not sure" that carry no symptom evidence. Their
   * likelihood is equal across all five conditions, so answering them never
   * changes the posterior.
   */
  neutralOptions: string[]
  /**
   * For single-choice questions this is a categorical distribution over
   * answers per condition: P(option | condition), summing to 1 over
   * informative options.
   *
   * For multi-select questions this is a per-option Bernoulli probability
   * P(option selected | condition). Unselected options are not treated as
   * negative evidence by the update model.
   */
  options: Record<string, Likelihoods>
}

export interface LikelihoodProfile {
  id: string
  version: string
  source: string
  validation: LikelihoodValidation
  mapping: string
  questions: Record<string, QuestionLikelihood>
}

export interface ValidatedStoppingCriterion {
  id: string
  source: string
  minTopProbability: number
  minMargin: number
  maxEntropy: number
}

export interface AdaptiveConfig {
  /**
   * `adaptive` uses information gain whenever a profile is available.
   * `auto` uses information gain only for a validated profile; otherwise the
   * existing fixed-order rule-based questionnaire is used.
   * `rule_based` always uses the existing fixed order.
   */
  mode: AdaptiveMode
  maxQuestions: number
  minExpectedInformationGain: number
  priorSmoothing: number
  probabilityFloor: number
  maxLogLikelihoodRatio: number
  redundancyDecay: number
  minRedundancyWeight: number
  visualEvidenceWeight: number
  uncertaintyTopProbability: number
  uncertaintyMargin: number
  uncertaintyEntropy: number
  /**
   * No validated stopping criterion exists in the repository. When this is
   * null, the operational defaults above are used and the session records
   * `stoppingRuleValidation: 'unvalidated_operational'`.
   */
  validatedStoppingCriterion: ValidatedStoppingCriterion | null
}

export type ApplicabilityRules = Record<string, (answers: Answers) => boolean>

export interface AnsweredQuestion {
  questionId: string
  questionText: string
  evidenceGroup: string
  optionIds: string[]
  optionLabels: string[]
  multi: boolean
  entropyBefore: number
  entropyAfter: number
  realizedInformationGain: number
  redundancyWeight: number
  topBefore: DiseaseType
  topAfter: DiseaseType
}

export interface AdaptiveSession {
  schemaVersion: 1
  sessionKey: string
  profileId: string
  profileValidation: LikelihoodValidation
  strategy: QuestionnaireStrategy
  stoppingRuleId: string
  stoppingRuleValidation: StoppingRuleValidation
  createdAt: string
  updatedAt: string
  /** Original EfficientNetB0 output. Never overwritten by the questionnaire. */
  imagePredictions: Prediction[]
  /** Normalised raw image softmax, retained for comparison. */
  imageDistribution: ProbabilityDistribution
  /** Smoothed image distribution used as the first prior. */
  prior: ProbabilityDistribution
  /** Current posterior after the answers received so far. */
  posterior: ProbabilityDistribution
  answers: Answers
  answeredQuestions: AnsweredQuestion[]
  currentQuestionId: string | null
  questionCount: number
  stopReason: StopReason | null
  outcome: AdaptiveOutcome | null
  outcomeBasis: OutcomeBasis | null
  entropyBits: number
}

export interface SelectionResult {
  question: DecisionQuestion | null
  expectedInformationGain: number
  redundancyWeight: number
  stopReason: StopReason | null
}

export interface AdaptiveEvidenceSummary {
  questionId: string
  optionIds: string[]
  optionLabels: string[]
  realizedInformationGain: number
}

/**
 * Compact, serialisable payload passed through the Expo Router result screen.
 * The full session remains on-device; this payload is enough to render the
 * result and evidence without persisting a duplicate questionnaire session.
 */
export interface AdaptiveResultPayload {
  schemaVersion: 1
  strategy: QuestionnaireStrategy
  state: AdaptiveOutcome
  predictions: Prediction[]
  posterior: ProbabilityDistribution
  imagePredictions: Prediction[]
  imageDistribution: ProbabilityDistribution
  top: Prediction | null
  stopReason: StopReason | null
  questionCount: number
  profileId: string
  profileValidation: LikelihoodValidation
  stoppingRuleId: string
  stoppingRuleValidation: StoppingRuleValidation
  entropyBits: number
  evidence: AdaptiveEvidenceSummary[]
}
