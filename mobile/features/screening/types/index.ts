export type ScreeningStatus = 'PENDING_REVIEW' | 'REVIEWED' | 'CONFIRMED' | 'DISMISSED'

export type ScreeningSource = 'DEVICE'

export interface ClaudeAnalysisResponse {
  status: string
  model?: string
  analyzed_at?: string
  latency_ms?: number | null
  usage?: {
    input_tokens?: number | null
    output_tokens?: number | null
  }
  result: {
    image_suitability: string
    screening_eligibility: string
    screening_message?: string
  } | null
  detail?: string
  token?: string
}

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
  ais_is_correct: boolean | null
  ais_created_at: string
}

export interface ScreeningSummary {
  ais_id: string
  disease: string
  ais_confidence: string
  ais_model_version: string
  ais_status: ScreeningStatus
  ais_source: ScreeningSource
  ais_is_correct: boolean | null
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
  prediction: string
  confidence: number
  model_version: string
  inference_time_ms?: number
  device?: string
  image_uri?: string
  claude_token?: string
}
