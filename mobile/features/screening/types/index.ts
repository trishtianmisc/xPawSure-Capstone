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
  ais_check_model: string
  ais_check_at: string | null
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
}
