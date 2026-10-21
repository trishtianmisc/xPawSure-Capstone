import type { DiseaseType, Prediction } from '../types/ai.types'

export type KnowledgeSource = 'MOCK' | 'VET'

export interface DecisionOption {
  id: string
  label: string
  votes: Partial<Record<DiseaseType, number>>
}

export interface DecisionQuestion {
  id: string
  text: string
  hint?: string
  multi?: boolean
  options: DecisionOption[]
}

export interface Knowledge {
  source: KnowledgeSource
  questions: DecisionQuestion[]
}

export type Answers = Record<string, string[]>

export type RefinementMethod = 'additive' | 'bayesian-provisional-v1'

export interface RefinedResult {
  refined: Prediction[]
  originalTop: Prediction
  refinedTop: Prediction
  changed: boolean
}

export interface BayesianRefinementResult extends RefinedResult {
  method: 'bayesian-provisional-v1'
  imageProbabilities: Record<DiseaseType, number>
  expertLogOdds: Record<DiseaseType, number>
  posterior: Record<DiseaseType, number>
}

export interface AdaptiveConfig {
  adaptiveOrderingEnabled: boolean
  earlyStoppingEnabled: boolean
  leadingPosteriorThreshold: number
  minTop2Margin: number
  minInformativeGroups: number
  stabilityInformativeUpdates: number
}

export interface QuestionnaireMode {
  adaptiveOrdering: boolean
  earlyStopping: boolean
}

export type StoppingReason =
  | 'criteria-met'
  | 'all-questions-answered'
  | 'completed-with-early-stopping-disabled'

export interface StoppingCriteria {
  leadingPosterior: boolean
  top2Margin: boolean
  informativeGroups: boolean
  stability: boolean
}

export interface StoppingDecision {
  shouldStop: boolean
  reason: StoppingReason | null
  answeredCount: number
  totalQuestions: number
  leading: DiseaseType | null
  runnerUp: DiseaseType | null
  leadingProbability: number
  runnerUpProbability: number
  margin: number
  informativeGroups: number
  stableInformativeUpdates: number
  criteria: StoppingCriteria
}

export interface AdaptiveAnswerState {
  answers: Answers
  askedQuestionIds: string[]
}
