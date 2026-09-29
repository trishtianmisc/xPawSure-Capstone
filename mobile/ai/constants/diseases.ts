import type { DiseaseType, ModelInfo } from '../types/ai.types'

export const DISEASE_LABELS: Record<DiseaseType, string> = {
  ALLERGIC_DERMATITIS: 'Allergic Dermatitis',
  BACTERIAL: 'Bacterial',
  FUNGAL: 'Fungal',
  HOTSPOT: 'Hotspot',
  MANGE: 'Mange',
}

export const DISEASE_DESCRIPTIONS: Record<DiseaseType, string> = {
  ALLERGIC_DERMATITIS: 'Chronic skin inflammation triggered by environmental allergens, causing itching, redness, and hives.',
  BACTERIAL: 'Bacterial skin infection causing pustules, redness, moist lesions, and discomfort.',
  FUNGAL: 'Fungal overgrowth on the skin, often causing circular lesions, scaling, and irritation.',
  HOTSPOT: 'Acute moist dermatitis; rapidly developing inflamed, weepy skin lesion with intense itching.',
  MANGE: 'Caused by mites burrowing into the skin, causing intense itching, hair loss, and thickened skin.',
}

export const MODEL_INFO: ModelInfo = {
  version: '2.0.0',
  path: require('../../assets/model/model.json'),
  inputSize: 224,
  labels: Object.keys(DISEASE_LABELS),
}

export const CONFIDENCE_THRESHOLDS = {
  VERY_HIGH: 0.95,
  HIGH: 0.90,
  MODERATE: 0.80,
} as const