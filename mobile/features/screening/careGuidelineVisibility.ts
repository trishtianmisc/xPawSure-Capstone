import type { ScreeningResultState } from '../../ai/types/ai.types'
import { isSupportedDiseaseCode } from './data/careGuidelines'

/**
 * Visibility rules for the Care Guidelines card.
 *
 * Display-only gates. They never read confidence percentages or feature
 * similarity values, never modify prediction/confidence/questionnaire state,
 * and never change screening classification.
 *
 * Result screen (fresh scan):
 *   Show only when Claude Vision accepted the image, a valid Top-1
 *   prediction exists, the final screening state is DISEASE_DETECTED, and
 *   the backend review is configured (unsaved preview stays hidden).
 *
 * Details screen (saved log):
 *   Show only for saved screenings that carry a valid disease code
 *   (persisted only from DISEASE_DETECTED results). UNCERTAIN and other
 *   non-disease states have no supported code and stay hidden.
 */

export interface ResultCareGuidelineVisibility {
  /** Final screening state from classification (not re-thresholded here). */
  state: ScreeningResultState | null
  /** True when the backend review key is missing (preview-only result). */
  reviewNotConfigured: boolean
  /** True when the on-device Top-1 prediction has a supported disease code. */
  hasValidTop1: boolean
  /** True when Claude Vision accepted the image (status OK + suitable + eligible). */
  claudeAccepted: boolean
}

/**
 * Result-screen gate. Requires Claude acceptance, a valid Top-1, configured
 * review, and final state DISEASE_DETECTED. Does not take confidence or
 * feature similarity as inputs.
 */
export function shouldShowCareGuidelines({
  state,
  reviewNotConfigured,
  hasValidTop1,
  claudeAccepted,
}: ResultCareGuidelineVisibility): boolean {
  if (reviewNotConfigured) return false
  if (!claudeAccepted) return false
  if (!hasValidTop1) return false
  return state === 'DISEASE_DETECTED'
}

/**
 * Details-screen gate for a saved screening. Shows only when the stored
 * disease code is one of the five supported classes (saved exclusively from
 * DISEASE_DETECTED results). No confidence or similarity inputs.
 */
export function shouldShowSavedCareGuidelines(
  diseaseCode?: string | null,
): boolean {
  return isSupportedDiseaseCode(diseaseCode)
}
