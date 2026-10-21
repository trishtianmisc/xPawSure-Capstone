import type { AdaptiveConfig } from './types.ts'

/**
 * Maximum absolute vet-consensus vote in the existing knowledge file.
 * Positive votes favour a condition; negative votes argue against it.
 */
export const MAX_ABS_VOTE = 30

/**
 * Metadata for the built-in likelihood profile. This profile is an explicit
 * transformation of the existing vet vote table, not a clinically validated
 * likelihood table. Do not change `validation` to `validated` without an
 * independent, veterinarian-confirmed dataset and a documented calibration
 * study.
 */
export const VET_VOTE_PROFILE_META = {
  id: 'vet-vote-exp-v1',
  version: '1.0.0',
  source:
    'Ordinal vet-consensus vote weights in mobile/ai/decisionTree/knowledge.ts ' +
    '(two veterinarian symptom-verification questionnaires, 2026-09-14 and 2026-09-19)',
  validation: 'unvalidated_expert_heuristic' as const,
  mapping:
    'vote v -> log-odds contribution (v / 30) * ln(4); single-choice options are ' +
    'softmax-normalised per condition over informative options; options with no ' +
    'vet-consensus votes (for example "Not sure") are neutral and receive an ' +
    'equal likelihood across conditions; multi-select options use a positive-only ' +
    'Bernoulli model. The |v|=30 cap corresponds to at most 4:1 evidence. This is ' +
    'an explicit heuristic mapping, not a calibrated probability model.',
}

/**
 * Questions that describe signs already visible to the image model. Their
 * questionnaire evidence is tempered because the image output is used as the
 * prior. This is a conservative, configurable assumption rather than a fitted
 * correction; no joint image-questionnaire calibration data exists.
 */
export const VISUAL_EVIDENCE_QUESTION_IDS: Record<string, true> = {
  circular: true,
  spread: true,
  symmetric: true,
  hot_touch: true,
  pustules: true,
  scaly: true,
  oozing: true,
  thickened: true,
  location: true,
}

/**
 * Clinically overlapping questions. Re-asking a question from the same group
 * receives a smaller likelihood weight to reduce double-counting correlated
 * symptoms. The groups are an explicit expert heuristic; they are not learned
 * from data.
 */
export const QUESTION_EVIDENCE_GROUPS: Record<string, string> = {
  ear_reflex: 'neuro_reflex',
  circular: 'lesion_shape',
  spread: 'distribution',
  symmetric: 'distribution',
  hot_touch: 'inflammation',
  pustules: 'inflammation',
  scaly: 'skin_surface',
  oozing: 'skin_surface',
  thickened: 'skin_surface',
  allergy_trigger: 'history',
  location: 'location',
  onset: 'history',
}

export function evidenceGroupFor(questionId: string): string {
  return QUESTION_EVIDENCE_GROUPS[questionId] ?? 'other'
}

const OPERATIONAL_DEFAULTS: Omit<AdaptiveConfig, 'mode'> = {
  // Preserve the existing 12-question ceiling. Adaptive selection normally
  // stops earlier when the expected information gain becomes negligible.
  maxQuestions: 12,
  // 0.02 bits is a numerical/product floor, not a clinically validated
  // stopping point.
  minExpectedInformationGain: 0.02,
  // Small prior smoothing keeps every class non-zero for numerical stability.
  // It is not a calibration procedure.
  priorSmoothing: 0.01,
  probabilityFloor: 1e-9,
  maxLogLikelihoodRatio: Math.log(4),
  redundancyDecay: 0.7,
  minRedundancyWeight: 0.4,
  visualEvidenceWeight: 0.8,
  // These operational presentation thresholds decide when the UI reports
  // "Unable to Determine". They are NOT validated diagnostic thresholds.
  uncertaintyTopProbability: 0.45,
  uncertaintyMargin: 0.1,
  uncertaintyEntropy: 1.5,
  // No validated criterion is available in the repository.
  validatedStoppingCriterion: null,
}

/**
 * Application configuration.
 *
 * `mode: 'adaptive'` enables the experimental information-gain selector with
 * the unvalidated vet-vote likelihood profile. Switching to `'auto'` restores
 * the existing fixed-order rule-based questionnaire until a validated
 * likelihood profile is supplied. `'rule_based'` always uses the existing
 * fixed order and the existing `refinePredictions` result.
 */
export const ADAPTIVE_CONFIG: AdaptiveConfig = {
  ...OPERATIONAL_DEFAULTS,
  mode: 'adaptive',
}

export const EXPERIMENTAL_NOTICE =
  'Adaptive follow-up is experimental. Questions are chosen by expected information gain ' +
  'using unvalidated vet-consensus likelihoods. This is not a diagnosis or a calibrated probability.'

export const ADAPTIVE_UNCERTAIN_MESSAGE =
  'The follow-up answers did not provide enough consistent evidence to select a leading condition. ' +
  'Please consult a veterinarian for a definitive examination.'

export const STOP_REASON_MESSAGES: Record<string, string> = {
  max_questions: 'The maximum number of follow-up questions was reached.',
  no_meaningful_question: 'No remaining question was expected to add meaningful information.',
  all_questions_answered: 'All applicable follow-up questions were answered.',
  insufficient_evidence: 'The available evidence was insufficient to select a leading condition.',
  conflicting_evidence: 'The answers pointed to more than one condition with similar weight.',
  profile_unavailable: 'A validated question likelihood profile was not available.',
}
