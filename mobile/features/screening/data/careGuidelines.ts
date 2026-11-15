import type { DiseaseType } from '../../../ai/types/ai.types'

/**
 * VETERINARIAN-APPROVED CARE GUIDELINES (universal).
 *
 * One set of care steps applies to all five supported screening classes.
 * Content is derived from the original care-guidelines reference PDF and
 * rewritten as general owner guidance. It is never a prescription.
 *
 * Content rules (keep when replacing content):
 *   - No medication dosages, units, or treatment schedules.
 *   - Treatment steps describe what a veterinarian prescribes and supervises;
 *     they are never an instruction for the owner to self-treat.
 *   - Never presented as a confirmed diagnosis or a treatment plan.
 *   - Selection depends ONLY on whether a valid primary prediction exists;
 *     the questionnaire and any other input must never influence it.
 *   - This module is display-only: it cannot modify AI prediction, AI
 *     confidence, the saved screening result, questionnaire answers, or
 *     booking logic.
 *
 * To update the content, edit UNIVERSAL_CARE_STEPS only — no component or
 * AI-logic changes are needed.
 */

export interface CareGuideline {
  /** Display title shown on the card (universal for every condition). */
  title: string
  /** Veterinarian-approved general care steps. */
  careSteps: string[]
}

/** Mandatory disclaimer rendered with every guideline card. */
export const CARE_GUIDELINE_DISCLAIMER =
  'General care information approved by a veterinarian. This is not a diagnosis and not a prescription; treatment must be prescribed and supervised by a veterinarian.'

/** Fallback when no valid primary prediction is available. */
export const GENERAL_CONSULT_MESSAGE =
  'No condition-specific guidance is available for this result. Please consult a veterinarian for advice about your pet\u2019s skin health.'

/** Six universal recommendations — identical for all five conditions. */
export const UNIVERSAL_CARE_STEPS: readonly string[] = [
  'Seek Veterinary Assessment: Have your dog examined by a licensed veterinarian to identify the possible cause and severity of the skin condition.',
  'Maintain Proper Hygiene: Keep your dog\u2019s affected skin area, resting place, and surroundings clean. Maintain proper hygiene to help prevent further skin problems.',
  'Prevent Further Irritation: Discourage excessive licking, scratching, and biting of affected areas to avoid additional irritation or injury.',
  'Follow Veterinary Recommendations: Follow the veterinarian\u2019s instructions regarding appropriate care and management of your dog\u2019s skin condition.',
  'Monitor Skin Condition and Recovery: Observe changes in redness, irritation, affected areas, hair loss, and overall skin condition. Seek veterinary advice if symptoms worsen or do not improve.',
  'Practice Proper Environmental Hygiene: Keep your dog\u2019s surroundings clean and follow veterinary advice on preventing possible transmission when the condition may be contagious.',
] as const

const UNIVERSAL_GUIDELINE: CareGuideline = {
  title: 'Care Guidelines',
  careSteps: [...UNIVERSAL_CARE_STEPS],
}

/**
 * Same universal guideline under every supported disease key so existing
 * Top-1 lookups keep working while content stays condition-agnostic.
 */
export const CARE_GUIDELINES: Record<DiseaseType, CareGuideline> = {
  ALLERGIC_DERMATITIS: UNIVERSAL_GUIDELINE,
  BACTERIAL: UNIVERSAL_GUIDELINE,
  FUNGAL: UNIVERSAL_GUIDELINE,
  HOTSPOT: UNIVERSAL_GUIDELINE,
  MANGE: UNIVERSAL_GUIDELINE,
}

/** Supported disease codes (keys of CARE_GUIDELINES). */
export const SUPPORTED_DISEASE_CODES: readonly string[] = Object.keys(
  CARE_GUIDELINES,
) as DiseaseType[]

export function isSupportedDiseaseCode(
  code?: string | null,
): code is DiseaseType {
  if (!code) return false
  return Object.prototype.hasOwnProperty.call(CARE_GUIDELINES, code)
}

/**
 * Returns the universal care guideline for a primary prediction code.
 * Pure lookup: the questionnaire and any other input cannot reach this
 * function. Returns null when the prediction is missing or unsupported so
 * the caller can show the general consultation message instead.
 */
export function getCareGuideline(prediction?: string | null): CareGuideline | null {
  if (!isSupportedDiseaseCode(prediction)) return null
  return CARE_GUIDELINES[prediction]
}
