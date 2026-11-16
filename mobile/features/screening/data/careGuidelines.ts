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
      'Identify underlying triggers with a veterinarian.',
      'Clean the affected area gently.',
      'Keep the area clean and dry.',
      'Ask a veterinarian to rule out ectoparasites.',
      'Give antipruritic or antihistamine medication only if a veterinarian prescribes it for your dog.',
      'Never use human allergy medicine on your own.',
    ],
  },
  BACTERIAL: {
    title: 'Bacterial Infection',
    careSteps: [
      'Identify the cause of the infection.',
      'Let a veterinarian perform lab tests such as CBC, sensitivity cultures and cytology.',
      'Give antibiotics only if a veterinarian prescribes them for your dog.',
      'Provide supportive care as advised by the veterinarian.',
      'Sanitize the environment.',
      'Keep the dog away from other animals until a veterinarian says it\'s safe.',
      'Monitor the dog, and return to the veterinarian if there\'s no improvement.',
    ],
  },
  FUNGAL: {
    title: 'Fungal Infection',
    careSteps: [
      'Give antifungal drugs, topical or oral, only as prescribed by a veterinarian.',
      'Use antifungal shampoo the veterinarian recommends.',
      'Disinfect and clean the dog\'s environment regularly.',
    ],
  },
  HOTSPOT: {
    title: 'Hotspot',
    careSteps: [
      'Prevent licking and scratching.',
      'Clean the affected area gently. Don\'t scrub or apply products to it.',
      'Ask a veterinarian before trimming the surrounding hair.',
      'Use antibacterial or antifungal shampoo only if a veterinarian recommends it, and follow their schedule.',
      'Keep the coat dry at all times.',
      'Seek professional help if the area spreads or worsens.',
    ],
  },
  MANGE: {
    title: 'Mange',
    careSteps: [
      'Have a veterinarian identify the type of mange through skin scraping and hair sample testing.',
      'Give topical products, medicated shampoo and antiparasitic drugs only as prescribed by a veterinarian.',
      'Give antibiotics for secondary bacterial infection only if a veterinarian prescribes them.',
      'Disinfect the environment.',
      'Keep the dog away from other animals as advised by a veterinarian.',
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
