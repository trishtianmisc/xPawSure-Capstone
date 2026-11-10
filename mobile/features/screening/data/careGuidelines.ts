import type { DiseaseType } from '../../../ai/types/ai.types'

/**
 * SAMPLE CONTENT — PENDING VETERINARY REVIEW.
 *
 * These care guidelines are static mock data collected while official
 * veterinary care guideline references are still being gathered. They are:
 *   - NOT veterinarian-approved
 *   - NOT clinically validated
 *   - NOT official medical recommendations
 *
 * Content rules (keep when replacing with reviewed content):
 *   - No medication names, dosages, prescriptions, or treatment schedules.
 *   - Never presented as a confirmed treatment plan.
 *   - Selection depends ONLY on the primary raw AI predicted class; the
 *     questionnaire and any other input must never influence it.
 *   - This module is display-only: it cannot modify AI prediction, AI
 *     confidence, the saved screening result, questionnaire answers, or
 *     booking logic.
 *
 * To replace with veterinarian-reviewed content later: edit CARE_GUIDELINES
 * in this file only — no component or AI-logic changes are needed.
 */

export interface CareGuideline {
  /** Display title shown on the card. */
  title: string
  /** Brief overview of the condition. */
  overview: string
  /** Recommended general precautions. */
  precautions: string[]
  /** Things to avoid. */
  avoid: string[]
  /** Situations that warrant a veterinary consultation. */
  consultVet: string[]
  /** Warning signs requiring prompt veterinary attention. */
  warningSigns: string[]
}

/** Mandatory disclaimer rendered with every guideline card. */
export const CARE_GUIDELINE_DISCLAIMER =
  'Sample Content — Pending Veterinary Review. This general information is not a diagnosis, not veterinarian-approved, and not a treatment plan. Always consult a veterinarian for advice about your pet.'

/** General fallback shown when the predicted class is missing or unsupported. */
export const GENERAL_CONSULT_MESSAGE =
  'No condition-specific guidance is available for this result. Please consult a veterinarian for advice about your pet\u2019s skin health.'

export const CARE_GUIDELINES: Record<DiseaseType, CareGuideline> = {
  ALLERGIC_DERMATITIS: {
    title: 'Allergic Dermatitis',
    overview:
      'Skin inflammation linked to environmental or contact allergens, often causing itching, redness, and irritation. This sample overview is pending veterinary review.',
    precautions: [
      'Keep your pet\u2019s sleeping and resting areas clean and washed regularly.',
      'Wipe your pet\u2019s coat and paws with plain water after walks to remove surface irritants.',
      'Note when and where itching seems to flare, and share the pattern with your veterinarian.',
      'Use only grooming products approved for pets; avoid human soaps and shampoos.',
    ],
    avoid: [
      'Do not give any medication, supplement, or topical treatment unless a veterinarian has prescribed it.',
      'Avoid letting your pet scratch or lick the affected area excessively; consider an e-collar only if a veterinarian advises it.',
      'Do not apply essential oils, alcohol-based products, or home remedies to irritated skin.',
    ],
    consultVet: [
      'Itching persists for more than a couple of days or keeps recurring.',
      'Redness, rashes, or hair loss spread over time.',
      'Your pet seems uncomfortable, restless, or keeps scratching a specific area.',
      'You are unsure what is causing the irritation.',
    ],
    warningSigns: [
      'Swelling of the face, muzzle, or eyes.',
      'Difficulty breathing or sudden collapse\u2014seek emergency veterinary care immediately.',
      'Weeping, bleeding, or painful skin lesions.',
      'Signs of skin infection such as pus, crusts, or a bad odor.',
    ],
  },
  BACTERIAL: {
    title: 'Bacterial Infection',
    overview:
      'Bacterial skin infections can cause redness, pustules, moist lesions, and discomfort. This sample overview is pending veterinary review and requires veterinary diagnosis.',
    precautions: [
      'Keep the affected area clean and dry; gently wash with a pet-safe cleanser if a veterinarian recommends it.',
      'Wash your pet\u2019s bedding, collar, and toys regularly while lesions are present.',
      'Wash your hands after touching the affected area.',
      'Follow your veterinarian\u2019s instructions for any prescribed care exactly.',
    ],
    avoid: [
      'Do not squeeze, scrub, or open pustules or lesions.',
      'Do not use human antiseptics, antibiotic creams, or leftover medications on your pet.',
      'Do not let your pet share brushes, bedding, or toys with other pets until cleared by a veterinarian.',
    ],
    consultVet: [
      'Red spots, pustules, or moist patches that do not improve.',
      'Your pet is scratching, licking, or rubbing the area constantly.',
      'Lesions seem to be spreading or are not healing.',
      'Any skin wound, no matter how small, that looks inflamed.',
    ],
    warningSigns: [
      'Lesions that are rapidly spreading, bleeding, or producing pus.',
      'Fever, lethargy, or loss of appetite together with skin lesions.',
      'A strong foul odor from the skin.',
      'Sudden severe swelling or pain\u2014seek prompt veterinary attention.',
    ],
  },
  FUNGAL: {
    title: 'Fungal Infection',
    overview:
      'Fungal overgrowth on the skin may cause scaling, circular patches, and irritation. This sample overview is pending veterinary review; fungal conditions need proper veterinary testing to confirm.',
    precautions: [
      'Keep the affected area clean and dry.',
      'Wash your pet\u2019s bedding, brushes, and toys regularly while lesions are present.',
      'Vacuum and clean areas where your pet rests to reduce environmental spread.',
      'Some fungal skin conditions can spread between pets and to people\u2014wash your hands after contact and check other pets for symptoms.',
    ],
    avoid: [
      'Do not apply human antifungal creams or powders to your pet.',
      'Do not share towels, brushes, or bedding between pets while lesions are present.',
      'Do not attempt to scrape or shave lesions at home.',
    ],
    consultVet: [
      'Circular or patchy hair loss that is spreading.',
      'Scaling, crusting, or dandruff-like flaking that does not resolve.',
      'You suspect ringworm or any fungal infection.',
      'Other pets or people in the household develop similar skin spots.',
    ],
    warningSigns: [
      'Lesions spreading quickly over the body.',
      'Pain, swelling, or oozing from the affected area.',
      'Skin infection symptoms such as pus or a bad odor.',
      'A person in the household develops a spreading red rash\u2014seek medical advice, and see a veterinarian for your pet promptly.',
    ],
  },
  HOTSPOT: {
    title: 'Hotspot',
    overview:
      'A hotspot (acute moist dermatitis) is a rapidly developing, inflamed, weepy skin lesion with intense itching. This sample overview is pending veterinary review.',
    precautions: [
      'Prevent licking and scratching with an e-collar if a veterinarian recommends one.',
      'Keep the area clean and dry; gently clip surrounding fur if a veterinarian advises it.',
      'Check your pet\u2019s skin daily for new lesions\u2014hotspots can appear quickly.',
      'Address underlying itch triggers such as fleas with veterinarian-approved prevention.',
    ],
    avoid: [
      'Do not apply hydrogen peroxide, alcohol, or home remedies to the lesion.',
      'Do not cover the lesion with bandages or ointments unless a veterinarian directs it.',
      'Do not let your pet scratch or chew the area; supervision or an e-collar helps.',
    ],
    consultVet: [
      'A moist, red, inflamed patch appears or grows quickly.',
      'The lesion is painful or your pet reacts when the area is touched.',
      'Hotspots keep returning in the same or different spots.',
      'You are unsure how to keep your pet from aggravating the area.',
    ],
    warningSigns: [
      'A lesion that doubles in size within a day or two.',
      'Deep ulceration, bleeding, or heavy oozing.',
      'Fever, lethargy, or refusal to eat alongside the skin lesion.',
      'Severe pain or sudden worsening\u2014seek prompt veterinary attention.',
    ],
  },
  MANGE: {
    title: 'Mange',
    overview:
      'Mange is associated with mites affecting the skin, often causing intense itching, hair loss, and thickened skin. This sample overview is pending veterinary review; mange requires veterinary testing and diagnosis.',
    precautions: [
      'Keep your pet clean and wash bedding, brushes, and toys regularly.',
      'Separate your pet from other animals until a veterinarian advises otherwise\u2014some types spread between pets and to people.',
      'Follow your veterinarian\u2019s instructions for any prescribed treatment exactly, including the full course.',
      'Wash your hands after handling your pet and clean shared household surfaces.',
    ],
    avoid: [
      'Do not use dog or cat shampoos, dips, or oils not prescribed by a veterinarian.',
      'Do not stop prescribed care early because the skin looks better\u2014finish the full course your veterinarian set.',
      'Do not share grooming tools, bedding, or collars with other pets while treatment continues.',
    ],
    consultVet: [
      'Intense, persistent itching with hair loss.',
      'Thickened, crusty, or scaly skin patches.',
      'Other pets in the household show similar symptoms.',
      'Symptoms do not improve with basic skin care.',
    ],
    warningSigns: [
      'Rapid hair loss spreading over the body.',
      'Deep skin lesions, bleeding, or secondary infection with pus or odor.',
      'Skin folds becoming painful, wet, or infected.',
      'Sudden severe worsening or signs of pain\u2014seek prompt veterinary attention.',
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
