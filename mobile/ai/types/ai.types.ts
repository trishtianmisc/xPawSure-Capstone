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

export interface ModelInfo {
  version: string
  path: string
  inputSize: number
  labels: string[]
}