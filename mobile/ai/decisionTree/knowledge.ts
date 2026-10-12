import type { Knowledge } from './types'

// MOCK DECISION-TREE KNOWLEDGE
// Placeholder weights pending transcription/confirmation of the two completed
// Veterinary Symptom Verification Questionnaires (Vet 1 + Vet 2).
// When the vet data is confirmed, replace only the contents of KNOWLEDGE below —
// types, engine, and UI consume this file unchanged.
// The question structure mirrors the vet questionnaire sections:
// Section 4 pair discriminators first (pinnal-pedal reflex, circular patches,
// localized vs generalized), then Section 1-3 supporting signs.

export const KNOWLEDGE: Knowledge = {
  source: 'MOCK',
  questions: [
    {
      id: 'ear_reflex',
      text: 'Gently rub the edge of your dog\u2019s ear. Does it trigger intense scratching or pawing at the air (a paddling reflex)?',
      hint: 'This is a known sign vets use to separate mange from allergies.',
      options: [
        { id: 'yes', label: 'Yes, strong scratching/pawing reflex', votes: { MANGE: 30, ALLERGIC_DERMATITIS: -20, BACTERIAL: -10 } },
        { id: 'no', label: 'No reaction', votes: { ALLERGIC_DERMATITIS: 10, MANGE: -20 } },
        { id: 'unsure', label: 'Not sure', votes: {} },
      ],
    },
    {
      id: 'circular',
      text: 'Do the affected areas look like round, circular patches?',
      hint: 'Round patches are a classic fungal sign.',
      options: [
        { id: 'yes', label: 'Yes, clearly round patches', votes: { FUNGAL: 30, MANGE: -15 } },
        { id: 'no', label: 'No, irregular or undefined shapes', votes: { MANGE: 10, FUNGAL: -15 } },
        { id: 'unsure', label: 'Not sure', votes: {} },
      ],
    },
    {
      id: 'spread',
      text: 'Is the problem limited to one clearly defined spot, or spread across multiple areas?',
      options: [
        { id: 'localized', label: 'One clearly defined spot', votes: { HOTSPOT: 25, BACTERIAL: 5, ALLERGIC_DERMATITIS: -15 } },
        { id: 'generalized', label: 'Spread across multiple areas', votes: { ALLERGIC_DERMATITIS: 25, MANGE: 10, HOTSPOT: -20 } },
        { id: 'unsure', label: 'Not sure', votes: {} },
      ],
    },
    {
      id: 'hot_touch',
      text: 'Does the affected area feel hot to the touch, or is there localized swelling?',
      options: [
        { id: 'yes', label: 'Yes, hot and/or swollen', votes: { HOTSPOT: 25, BACTERIAL: 15, FUNGAL: -10 } },
        { id: 'no', label: 'No', votes: { FUNGAL: 5, HOTSPOT: -10 } },
        { id: 'unsure', label: 'Not sure', votes: {} },
      ],
    },
    {
      id: 'pustules',
      text: 'Are there pimple-like bumps, pustules, or abscesses on the skin?',
      options: [
        { id: 'yes', label: 'Yes', votes: { BACTERIAL: 30, MANGE: -15 } },
        { id: 'no', label: 'No', votes: { MANGE: 10, BACTERIAL: -15 } },
        { id: 'unsure', label: 'Not sure', votes: {} },
      ],
    },
    {
      id: 'scaly',
      text: 'Is the skin scaly, flaky, or crusted?',
      options: [
        { id: 'yes', label: 'Yes, dry and scaly/crusted', votes: { MANGE: 15, FUNGAL: 15, ALLERGIC_DERMATITIS: 10, HOTSPOT: -10 } },
        { id: 'no', label: 'No, skin looks moist or smooth', votes: { HOTSPOT: 10, BACTERIAL: 5, MANGE: -5, FUNGAL: -5 } },
        { id: 'unsure', label: 'Not sure', votes: {} },
      ],
    },
    {
      id: 'location',
      text: 'Where did it first appear? Select all that apply.',
      multi: true,
      options: [
        { id: 'ears', label: 'Ears / ear margins', votes: { MANGE: 10, FUNGAL: 10 } },
        { id: 'face', label: 'Face / muzzle', votes: { ALLERGIC_DERMATITIS: 8, BACTERIAL: 8, MANGE: 8 } },
        { id: 'paws', label: 'Paws / between toes', votes: { FUNGAL: 8, ALLERGIC_DERMATITIS: 8 } },
        { id: 'belly', label: 'Belly / groin', votes: { ALLERGIC_DERMATITIS: 8, MANGE: 8 } },
        { id: 'back', label: 'Back / trunk', votes: { FUNGAL: 8, HOTSPOT: 8, BACTERIAL: 8 } },
        { id: 'neck', label: 'Neck / collar area', votes: { HOTSPOT: 10, BACTERIAL: 8 } },
        { id: 'general', label: 'Whole body (generalized)', votes: { MANGE: 12, ALLERGIC_DERMATITIS: 10 } },
      ],
    },
    {
      id: 'onset',
      text: 'How quickly did the problem appear after you first noticed it?',
      options: [
        { id: 'sudden', label: 'Within 48 hours (sudden)', votes: { HOTSPOT: 30, MANGE: -10, FUNGAL: -10, BACTERIAL: -5 } },
        { id: 'gradual', label: 'Over weeks (gradual)', votes: { MANGE: 10, FUNGAL: 10, ALLERGIC_DERMATITIS: 10, BACTERIAL: 10, HOTSPOT: -20 } },
        { id: 'unsure', label: 'Not sure', votes: {} },
      ],
    },
  ],
}
