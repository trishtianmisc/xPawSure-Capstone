import type { ScreeningResultState } from '../types/ai.types'

/**
 * Pure screening constants (no model-asset loading), so decision logic can be
 * imported by unit tests without resolving bundled model files.
 */
export const SCREENING_THRESHOLDS = {
  IMAGE_MIN_BRIGHTNESS: 15,
  IMAGE_MAX_BRIGHTNESS: 240,
  IMAGE_MIN_VARIANCE: 30,
  IMAGE_MIN_COLOR_STD: 5,
  FEATURE_SIMILARITY_MIN: 0.10,
  FEATURE_SIMILARITY_HIGH: 0.50,
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
