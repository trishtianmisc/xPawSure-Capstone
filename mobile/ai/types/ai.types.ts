export type DiseaseType =
  | 'ALLERGIC_DERMATITIS'
  | 'BACTERIAL'
  | 'FUNGAL'
  | 'HOTSPOT'
  | 'MANGE'

export interface Prediction {
  disease: DiseaseType
  confidence: number
  label: string
}

export interface ScreeningResult {
  predictions: Prediction[]
  topPrediction: Prediction
  inferenceTimeMs: number
  modelVersion: string
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