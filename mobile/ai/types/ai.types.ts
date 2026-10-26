export type DiseaseType =
  | 'ALLERGIC_DERMATITIS'
  | 'BACTERIAL'
  | 'FUNGAL'
  | 'HOTSPOT'
  | 'MANGE'

export type ScreeningResultState = 'DISEASE_DETECTED' | 'NOT_SKIN_IMAGE' | 'UNCERTAIN' | 'INVALID_IMAGE'

export interface Prediction {
  disease: DiseaseType
  confidence: number
  label: string
}

export type ClaudeApiStatus =
  | 'OK'
  | 'NOT_REQUESTED'
  | 'NOT_CONFIGURED'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'QUOTA_EXHAUSTED'
  | 'MALFORMED_RESPONSE'
  | 'PROVIDER_ERROR'

export type ClaudeValidationStatus = ClaudeApiStatus | 'NOT_VALIDATED' | 'VALIDATION_ERROR'

export interface ClaudeValidationDecision {
  status: ClaudeValidationStatus
  approved: boolean
  suitability: string | null
  eligibility: string | null
  message: string | null
  token: string | null
}

export type ImageReportStatus =
  | 'ok'
  | 'quality_failed'
  | 'low_similarity'
  | 'not_skin'
  | 'not_validated'
  | 'validation_error'

export interface ImageReport {
  uri: string
  status: ImageReportStatus
  similarity: number | null
  claudeStatus?: ClaudeValidationStatus
  claudeMessage?: string
}

export interface ScreeningValidation {
  imageUri: string
  token: string
}

export interface ScreeningResult {
  predictions: Prediction[]
  topPrediction?: Prediction
  inferenceTimeMs: number
  modelVersion: string
  state: ScreeningResultState
  stateMessage: string
  imageReports?: ImageReport[]
  validation?: ScreeningValidation
}

export interface ScreeningUploadPayload {
  pet_id: string
  consultation_id?: string
  prediction: string
  confidence: number
  top_predictions: { disease: string; confidence: number; label: string }[]
  model_version: string
  inference_time_ms: number
  image_uri: string
}

export interface ModelInfo {
  version: string
  path: string
  inputSize: number
  labels: string[]
}