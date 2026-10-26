export type ScreeningStatus = 'PENDING_REVIEW' | 'REVIEWED' | 'CONFIRMED' | 'DISMISSED'

export type ScreeningSource = 'DEVICE'

export type ClaudeAnalysisStatus =
  | 'NOT_REQUESTED'
  | 'OK'
  | 'NOT_CONFIGURED'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'QUOTA_EXHAUSTED'
  | 'MALFORMED_RESPONSE'
  | 'PROVIDER_ERROR'

export type ClaudeImageSuitability =
  | 'SUITABLE'
  | 'POOR_QUALITY'
  | 'NOT_DOG_SKIN'
  | 'NO_VISIBLE_LESIONS'
  | 'WOUND_OR_INJURY'
  | 'UNCERTAIN'

export type ScreeningEligibility = 'ELIGIBLE' | 'NOT_ELIGIBLE'

export type ClaudeConditionCode =
  | 'ALLERGIC_DERMATITIS'
  | 'BACTERIAL'
  | 'FUNGAL'
  | 'HOTSPOT'
  | 'MANGE'
  | 'OTHER'
  | 'UNCLEAR'

export type CrossAnalysisStatus = 'COMPATIBLE' | 'DIFFERENT' | 'INSUFFICIENT_EVIDENCE'

export interface ClaudeImageQuality {
  adequate: boolean
  observations: string[]
}

export interface ClaudeConditionAssessment {
  closest_match: ClaudeConditionCode
  other_possibilities: ClaudeConditionCode[]
  unclear: boolean
  rationale: string
}

export interface ClaudeFindings {
  image_suitability: ClaudeImageSuitability
  screening_eligibility: ScreeningEligibility
  screening_message: string
  visible_features: string[]
  image_quality: ClaudeImageQuality
  condition_assessment: ClaudeConditionAssessment
  vet_recommendation: string
}

export interface ClaudeTokenUsage {
  input_tokens: number | null
  output_tokens: number | null
}

export interface ClaudeAnalysisResponse {
  status: ClaudeAnalysisStatus
  model: string
  analyzed_at: string
  latency_ms: number | null
  usage: ClaudeTokenUsage
  result: ClaudeFindings | null
  detail: string
  token: string
}

export interface ScreeningImage {
  url: string
  content_type: string
  size_bytes: number
  sha256: string
  created_at: string
}

export interface ScreeningClaude {
  status: ClaudeAnalysisStatus
  model: string | null
  result: ClaudeFindings | null
  analyzed_at: string | null
  latency_ms: number | null
  usage: ClaudeTokenUsage
}

export interface CrossAnalysis {
  status: CrossAnalysisStatus
  summary: string
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
  image: ScreeningImage | null
  claude: ScreeningClaude
  cross_analysis: CrossAnalysis
  /** True while a non-cancelled appointment was booked from this scan. */
  is_booked: boolean
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
  image_url?: string | null
  claude_status?: ClaudeAnalysisStatus
  cross_analysis_status?: CrossAnalysisStatus
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
