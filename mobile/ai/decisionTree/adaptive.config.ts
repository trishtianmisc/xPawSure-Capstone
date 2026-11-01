import type { AdaptiveConfig } from './types'

export const ADAPTIVE_ORDERING_ENABLED = true

export const EARLY_STOPPING_ENABLED = false

export const LEADING_POSTERIOR_THRESHOLD = 0.85

export const MIN_TOP2_MARGIN = 0.30

export const MIN_INFORMATIVE_GROUPS = 2

export const STABILITY_INFORMATIVE_UPDATES = 2

export const ADAPTIVE_CONFIG: AdaptiveConfig = {
  adaptiveOrderingEnabled: ADAPTIVE_ORDERING_ENABLED,
  earlyStoppingEnabled: EARLY_STOPPING_ENABLED,
  leadingPosteriorThreshold: LEADING_POSTERIOR_THRESHOLD,
  minTop2Margin: MIN_TOP2_MARGIN,
  minInformativeGroups: MIN_INFORMATIVE_GROUPS,
  stabilityInformativeUpdates: STABILITY_INFORMATIVE_UPDATES,
}
