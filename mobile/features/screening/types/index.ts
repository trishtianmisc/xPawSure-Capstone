export type ScreeningStatus = 'PENDING_REVIEW' | 'REVIEWED' | 'CONFIRMED' | 'DISMISSED'

export type ScreeningSource = 'MOCK' | 'DEVICE'

export type SecondCheckVerdict = 'AGREE' | 'DISAGREE' | 'UNCERTAIN' | 'UNAVAILABLE'

export interface Screening {
  ais_id: string
  pet_id: string
  pet_name: string
  disease: string
  disease_code: string
  ais_confidence: string
  ais_model_version: string
  ais_inference_time_ms: number | null
  ais_device: string | null
  ais_status: ScreeningStatus
  ais_source: ScreeningSource
  ais_created_at: string
  ais_check_verdict: SecondCheckVerdict | null
  ais_check_notes: string
  ais_check_remedy: string
  ais_check_model: string
  ais_check_at: string | null
  ais_refinement: RefinementAudit | null
}

export interface QuizPredictionInput {
  disease_code: string
  confidence: number
}

export interface QuizQuestion {
  id: number
  text: string
}

export type QuizAnswer = 'YES' | 'NO' | 'NOT_SURE'

export interface QuizQuestionsPayload {
  pet_id: string
  predictions: QuizPredictionInput[]
  image?: string
}

export interface QuizValidatePayload extends QuizQuestionsPayload {
  questions: QuizQuestion[]
  answers: Record<string, QuizAnswer>
}

export interface QuizValidateResult {
  disease_code: string
  disease_name: string
  confidence: number
  rationale: string
}

export interface RefinementAudit {
  original: { disease: string; confidence: number }[]
  questions?: QuizQuestion[]
  answers?: Record<string, QuizAnswer>
  refined?: { disease: string; confidence: number; rationale: string }
}

export interface ScreeningSummary {
  ais_id: string
  disease: string
  ais_confidence: string
  ais_model_version: string
  ais_status: ScreeningStatus
  ais_source: ScreeningSource
  ais_created_at: string
}

export interface ScreeningListResponse {
  total: number
  page: number
  page_size: number
  total_pages: number
  results: Screening[]
}

export interface CreateScreeningPayload {
  pet_id: string
  source: ScreeningSource
  prediction?: string
  confidence?: number
  model_version?: string
  inference_time_ms?: number
  device?: string
  image?: string
  refinement?: RefinementAudit
}
