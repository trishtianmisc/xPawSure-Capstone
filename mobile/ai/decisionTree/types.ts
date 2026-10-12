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

export interface RefinedResult {
  refined: Prediction[]
  originalTop: Prediction
  refinedTop: Prediction
  changed: boolean
}
