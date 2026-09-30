import type { DiseaseType, ModelInfo, ScreeningResultState } from '../types/ai.types'

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

export const SCREENING_THRESHOLDS = {
  IMAGE_MIN_BRIGHTNESS: 15,
  IMAGE_MAX_BRIGHTNESS: 240,
  IMAGE_MIN_VARIANCE: 30,
  IMAGE_MIN_COLOR_STD: 5,
  FEATURE_SIMILARITY_MIN: 0.10,
  FEATURE_SIMILARITY_HIGH: 0.30,
} as const

export const SCREENING_STATE_MESSAGES: Record<ScreeningResultState, { title: string; message: string }> = {
  DISEASE_DETECTED: {
    title: 'Possible Condition Detected',
    message: 'The AI analysis suggests a potential skin condition. Please consult a veterinarian for definitive diagnosis.',
  },
  NOT_SKIN_IMAGE: {
    title: 'Not a Skin Image',
    message: "The image doesn't appear to show a pet skin condition. Please upload a close-up photo of the affected skin area.",
  },
  UNCERTAIN: {
    title: 'Unable to Determine',
    message: 'The AI could not confidently identify a condition from this image. Please retake the photo with the affected skin area clearly visible and well-lit.',
  },
  INVALID_IMAGE: {
    title: 'Image Not Suitable',
    message: 'The image quality is too poor for AI analysis. Please capture a clear, well-lit photo of the affected skin area.',
  },
}