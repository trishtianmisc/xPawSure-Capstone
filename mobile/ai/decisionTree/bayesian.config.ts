import type { RefinementMethod } from './types'

export const REFINEMENT_METHOD: RefinementMethod = 'bayesian-provisional-v1'

export const PROVISIONAL_VOTE_LOG_SCALE = 20

export const MAX_EXPERT_LOG_ODDS = 2.5

export const QUESTION_GROUPS: readonly (readonly string[])[] = [
  ['ear_reflex'],
  ['circular', 'scaly'],
  ['spread', 'symmetric', 'location'],
  ['hot_touch', 'oozing'],
  ['pustules'],
  ['thickened'],
  ['allergy_trigger'],
  ['onset'],
]
