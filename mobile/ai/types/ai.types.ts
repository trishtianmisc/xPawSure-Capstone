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

export interface ScreeningResult {
  predictions: Prediction[]
  topPrediction?: Prediction
  inferenceTimeMs: number
  modelVersion: string
  state: ScreeningResultState
  stateMessage: string
}

export interface ModelInfo {
  version: string
  path: string
  inputSize: number
  labels: string[]
}
