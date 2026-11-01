import type { Knowledge } from './types'

// VET-INFORMED SCREENING REFERENCE
// Derived from the two completed Veterinary Symptom Verification Questionnaires:
//   Vet 1 — Maggie Galawara, South Veterinary Clinic, 13 yrs — 2026-09-14
//   Vet 2 — Ivone Claire D. Arrogante, South Veterinary Clinic, 10 yrs — 2026-09-19
// Source sections: pair discriminators (both rated High confidence) from each
// vet's Table 5; onset/contagion from Table 4; body locations from Table 3.
// The vote points below are a manual screening reference, not calibrated
// likelihoods and not a reproducibly averaged consensus. The vets conflict on
// sudden onset (Vet 1: Hotspot, Vet 2: Allergic Dermatitis). These marks must
// be confirmed with the veterinarians before being treated as clinical
// knowledge. See docs/ai/BAYESIAN_REFINEMENT.md for the current method and
// limitations.

export const KNOWLEDGE: Knowledge = {
  source: 'VET',
  questions: [
    {
      id: 'ear_reflex',
      text: 'Gently rub the edge of your dog\u2019s ear. Does it trigger intense scratching or pawing at the air (a paddling reflex)?',
      hint: 'Both vets rated this the best sign for separating mange from allergies and infection.',
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
        { id: 'yes', label: 'Yes, clearly round patches', votes: { FUNGAL: 25, MANGE: -12, HOTSPOT: 5 } },
        { id: 'no', label: 'No, irregular or undefined shapes', votes: { MANGE: 10, FUNGAL: -15 } },
        { id: 'unsure', label: 'Not sure', votes: {} },
      ],
    },
    {
      id: 'spread',
      text: 'Is the problem limited to one clearly defined spot, or spread across multiple areas?',
      hint: 'Vets use this to separate hot spots from bacterial infection and allergies.',
      options: [
        { id: 'localized', label: 'One clearly defined spot', votes: { HOTSPOT: 25, BACTERIAL: -5, ALLERGIC_DERMATITIS: -15 } },
        { id: 'generalized', label: 'Spread across multiple areas', votes: { ALLERGIC_DERMATITIS: 20, MANGE: 8, BACTERIAL: -5, HOTSPOT: -15 } },
        { id: 'unsure', label: 'Not sure', votes: {} },
      ],
    },
    {
      id: 'symmetric',
      text: 'Is the affected skin on both sides of the body (for example, both ears, both flanks, or matching patches left and right)?',
      hint: 'Symmetry is a classic sign vets use to favor allergies over infection.',
      options: [
        { id: 'yes', label: 'Yes, both sides look similar', votes: { ALLERGIC_DERMATITIS: 20, MANGE: 10, FUNGAL: -8, BACTERIAL: -10, HOTSPOT: -12 } },
        { id: 'no', label: 'No, one side or random patches', votes: { FUNGAL: 5, BACTERIAL: 5, HOTSPOT: 5, ALLERGIC_DERMATITIS: -10, MANGE: -5 } },
        { id: 'unsure', label: 'Not sure', votes: {} },
      ],
    },
    {
      id: 'hot_touch',
      text: 'Does the affected area feel hot to the touch, or is there localized swelling?',
      options: [
        { id: 'yes', label: 'Yes, hot and/or swollen', votes: { HOTSPOT: 25, BACTERIAL: 15, ALLERGIC_DERMATITIS: 8, MANGE: 3, FUNGAL: -10 } },
        { id: 'no', label: 'No', votes: { FUNGAL: 5, MANGE: 3, HOTSPOT: -10, BACTERIAL: -5 } },
        { id: 'unsure', label: 'Not sure', votes: {} },
      ],
    },
    {
      id: 'pustules',
      text: 'Are there pimple-like bumps, pustules, or abscesses on the skin?',
      hint: 'Both vets rated pustules strongest for bacterial infection.',
      options: [
        { id: 'yes', label: 'Yes', votes: { BACTERIAL: 25, MANGE: 3, ALLERGIC_DERMATITIS: 3, FUNGAL: -8, HOTSPOT: -8 } },
        { id: 'no', label: 'No', votes: { MANGE: 5, ALLERGIC_DERMATITIS: 3, BACTERIAL: -15 } },
        { id: 'unsure', label: 'Not sure', votes: {} },
      ],
    },
    {
      id: 'scaly',
      text: 'Is the skin scaly, flaky, or crusted?',
      options: [
        { id: 'yes', label: 'Yes, dry and scaly/crusted', votes: { MANGE: 15, FUNGAL: 15, ALLERGIC_DERMATITIS: 10, BACTERIAL: -6, HOTSPOT: -12 } },
        { id: 'no', label: 'No, skin looks moist or smooth', votes: { HOTSPOT: 10, BACTERIAL: 5, MANGE: -5, FUNGAL: -5 } },
        { id: 'unsure', label: 'Not sure', votes: {} },
      ],
    },
    {
      id: 'oozing',
      text: 'Does the area look moist, weepy, or oozing fluid?',
      hint: 'Weeping, oozing skin points more to infection or hot spots.',
      options: [
        { id: 'yes', label: 'Yes, moist or oozing', votes: { HOTSPOT: 18, BACTERIAL: 15, FUNGAL: 8, MANGE: -6, ALLERGIC_DERMATITIS: -5 } },
        { id: 'no', label: 'No, it looks dry', votes: { MANGE: 5, ALLERGIC_DERMATITIS: 5, FUNGAL: 2, BACTERIAL: -5, HOTSPOT: -8 } },
        { id: 'unsure', label: 'Not sure', votes: {} },
      ],
    },
    {
      id: 'thickened',
      text: 'Does the skin feel thick, leathery, or hardened compared to normal skin?',
      hint: 'Leathery thickening is commonly seen with chronic mange.',
      options: [
        { id: 'yes', label: 'Yes, thick and leathery', votes: { MANGE: 12, FUNGAL: 6, ALLERGIC_DERMATITIS: 6, BACTERIAL: -8, HOTSPOT: -10 } },
        { id: 'no', label: 'No, feels normal', votes: { BACTERIAL: 5, HOTSPOT: 8, MANGE: -5 } },
        { id: 'unsure', label: 'Not sure', votes: {} },
      ],
    },
    {
      id: 'allergy_trigger',
      text: 'Does the problem seem to flare up with seasons (heat, humidity, pollen) or after diet changes?',
      hint: 'Seasonal or diet-linked flares are a hallmark of allergic dermatitis.',
      options: [
        { id: 'yes', label: 'Yes, linked to seasons or diet', votes: { ALLERGIC_DERMATITIS: 25, MANGE: -10, BACTERIAL: -8, FUNGAL: -5, HOTSPOT: -5 } },
        { id: 'no', label: 'No clear trigger', votes: { MANGE: 5, FUNGAL: 5, BACTERIAL: 5, ALLERGIC_DERMATITIS: -10 } },
        { id: 'unsure', label: 'Not sure', votes: {} },
      ],
    },
    {
      id: 'location',
      text: 'Where did it first appear? Select all that apply.',
      multi: true,
      options: [
        { id: 'ears', label: 'Ears / ear margins', votes: { MANGE: 10, FUNGAL: 10, ALLERGIC_DERMATITIS: 2, BACTERIAL: 2 } },
        { id: 'face', label: 'Face / muzzle', votes: { MANGE: 8, ALLERGIC_DERMATITIS: 8, BACTERIAL: 8 } },
        { id: 'paws', label: 'Paws / between toes', votes: { FUNGAL: 8, ALLERGIC_DERMATITIS: 8 } },
        { id: 'elbows', label: 'Elbows / pressure points', votes: { MANGE: 8, BACTERIAL: 6, HOTSPOT: 6 } },
        { id: 'belly', label: 'Belly / groin', votes: { ALLERGIC_DERMATITIS: 8, MANGE: 8, BACTERIAL: 4 } },
        { id: 'back', label: 'Back / trunk', votes: { FUNGAL: 8, HOTSPOT: 8, BACTERIAL: 8 } },
        { id: 'tail', label: 'Base of tail', votes: { FUNGAL: 8, BACTERIAL: 6, HOTSPOT: 6 } },
        { id: 'neck', label: 'Neck / collar area', votes: { HOTSPOT: 10, BACTERIAL: 8, FUNGAL: 4, ALLERGIC_DERMATITIS: 4 } },
        { id: 'general', label: 'Whole body (generalized)', votes: { MANGE: 12, ALLERGIC_DERMATITIS: 10 } },
      ],
    },
    {
      id: 'onset',
      text: 'How quickly did the problem appear after you first noticed it?',
      hint: 'Vets split on this — sudden sores favor hot spots, while flaring allergies can also appear quickly.',
      options: [
        { id: 'sudden', label: 'Within 48 hours (sudden)', votes: { HOTSPOT: 20, ALLERGIC_DERMATITIS: 8, MANGE: -8, FUNGAL: -8, BACTERIAL: -5 } },
        { id: 'gradual', label: 'Over weeks (gradual)', votes: { MANGE: 10, FUNGAL: 10, ALLERGIC_DERMATITIS: 8, BACTERIAL: 10, HOTSPOT: -15 } },
        { id: 'unsure', label: 'Not sure', votes: {} },
      ],
    },
  ],
}
