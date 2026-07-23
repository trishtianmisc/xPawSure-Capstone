import type { DiseaseType, ModelInfo } from '../types/ai.types'

export const DISEASE_LABELS: Record<DiseaseType, string> = {
  MANGE: 'Mange',
  FUNGAL_INFECTION: 'Fungal Infection',
  BACTERIAL_INFECTION: 'Bacterial Infection',
  HOT_SPOT: 'Hot Spot',
  RINGWORM: 'Ringworm',
  TICK_BITE_DERMATITIS: 'Tick Bite Dermatitis',
  ALLERGIC_DERMATITIS: 'Allergic Dermatitis',
  FLEA_ALLERGY_DERMATITIS: 'Flea Allergy Dermatitis',
  SEBORRHEA: 'Seborrhea',
  YEAST_INFECTION: 'Yeast Infection',
}

export const DISEASE_DESCRIPTIONS: Record<DiseaseType, string> = {
  MANGE: 'Caused by mites burrowing into the skin, causing intense itching and hair loss.',
  FUNGAL_INFECTION: 'Fungal overgrowth on the skin, often causing circular lesions and irritation.',
  BACTERIAL_INFECTION: 'Bacterial skin infection causing pustules, redness, and discomfort.',
  HOT_SPOT: 'Acute moist dermatitis; rapidly developing inflamed skin lesion.',
  RINGWORM: 'Fungal infection of the skin causing circular, scaly patches.',
  TICK_BITE_DERMATITIS: 'Skin inflammation and reaction caused by a tick bite.',
  ALLERGIC_DERMATITIS: 'Chronic skin inflammation triggered by environmental allergens.',
  FLEA_ALLERGY_DERMATITIS: 'Severe allergic reaction to flea saliva causing intense itching.',
  SEBORRHEA: 'Skin condition causing flaky, scaly, or greasy skin patches.',
  YEAST_INFECTION: 'Overgrowth of Malassezia yeast causing greasy, smelly skin.',
}

export const MODEL_INFO: ModelInfo = {
  version: '1.0.0',
  path: require('../../assets/model/model.tflite'),
  inputSize: 224,
  labels: Object.keys(DISEASE_LABELS),
}

export const CONFIDENCE_THRESHOLDS = {
  VERY_HIGH: 0.95,
  HIGH: 0.90,
  MODERATE: 0.80,
} as const
