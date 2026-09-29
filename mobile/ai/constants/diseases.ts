import type { DiseaseType, ModelInfo } from '../types/ai.types'

export const DISEASE_LABELS: Record<DiseaseType, string> = {
  ALLERGIC_DERMATITIS: 'Allergic Dermatitis',
  BACTERIAL: 'Bacterial',
  FUNGAL: 'Fungal',
  HOTSPOT: 'Hotspot',
  MANGE: 'Mange',
}

export const MODEL_INFO: ModelInfo = {
  version: '2.0.0',
  path: require('../../assets/model/model.json'),
  inputSize: 224,
  labels: Object.keys(DISEASE_LABELS),
}