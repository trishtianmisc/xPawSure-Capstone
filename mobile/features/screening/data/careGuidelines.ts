import type { DiseaseType } from '../../../ai/types/ai.types'

/**
 * VETERINARIAN-APPROVED CARE GUIDELINES.
 *
 * The care steps below come from the veterinarian-approved care guidelines
 * reference for the five supported screening classes. They are general
 * guidance only and must never be presented as a prescription.
 *
 * Content rules (keep when replacing content):
 *   - No medication dosages, units, or treatment schedules.
 *   - Treatment steps describe what a veterinarian prescribes and supervises;
 *     they are never an instruction for the owner to self-treat.
 *   - Never presented as a confirmed diagnosis or a treatment plan.
 *   - Selection depends ONLY on the primary raw AI predicted class; the
 *     questionnaire and any other input must never influence it.
 *   - This module is display-only: it cannot modify AI prediction, AI
 *     confidence, the saved screening result, questionnaire answers, or
 *     booking logic.
 *
 * To update the content, edit CARE_GUIDELINES in this file only — no
 * component or AI-logic changes are needed.
 */

export interface CareGuideline {
  /** Display title shown on the card. */
  title: string
  /** Veterinarian-approved general care steps. */
  careSteps: string[]
}

/** Mandatory disclaimer rendered with every guideline card. */
export const CARE_GUIDELINE_DISCLAIMER =
  'General care information approved by a veterinarian. This is not a diagnosis and not a prescription; treatment must be prescribed and supervised by a veterinarian.'

/** General fallback shown when the predicted class is missing or unsupported. */
export const GENERAL_CONSULT_MESSAGE =
  'No condition-specific guidance is available for this result. Please consult a veterinarian for advice about your pet\u2019s skin health.'

export const CARE_GUIDELINES: Record<DiseaseType, CareGuideline> = {
  ALLERGIC_DERMATITIS: {
    title: 'Allergic Dermatitis',
    careSteps: [
      'Identify underlying triggers',
      'Clean the affected area',
      'Keep the area clean and dry',
      'Rule out ectoparasites',
      'Administer antipruritic or antihistamine medication',
    ],
  },
  BACTERIAL: {
    title: 'Bacterial Infection',
    careSteps: [
      'Identify the cause of infection',
      'Perform lab tests such as CBC, sensitivity cultures, and cytology',
      'Administer antibiotics prescribed by the veterinarian',
      'Provide supportive care',
      'Sanitize the environment. Quarantine and isolate the infected animal.',
      'Monitor the animal and follow up if there is no improvement',
    ],
  },
  FUNGAL: {
    title: 'Fungal Infection',
    careSteps: [
      'Topical or oral antifungal drug administration',
      'Whole-body rinse with antifungal shampoo twice a week',
      'Disinfection and cleaning of the environment',
    ],
  },
  HOTSPOT: {
    title: 'Hotspot',
    careSteps: [
      'Avoid self-trauma, such as licking and scratching',
      'Clean the affected area gently',
      'Trim the hair around the affected area',
      'Bathe twice a week using antibacterial and antifungal shampoo',
      'Keep the coat dry at all times',
      'Seek professional help',
    ],
  },
  MANGE: {
    title: 'Mange',
    careSteps: [
      'Identify the type of mange (through skin scraping)',
      'Take a hair sample from your pet',
      'Administer medication such as topical medications, shampoo, and antiparasitic medications',
      'Administer antibiotics to treat secondary bacterial infection',
      'Disinfect the environment and quarantine the infected animal',
    ],
  },
}

/**
 * Returns the care guideline for the primary raw AI predicted class.
 * Pure lookup: the questionnaire and any other input cannot reach this
 * function. Returns null when the prediction is missing or unsupported so
 * the caller can show the general consultation message instead.
 */
export function getCareGuideline(prediction?: string | null): CareGuideline | null {
  if (!prediction) return null
  return CARE_GUIDELINES[prediction as DiseaseType] ?? null
}
