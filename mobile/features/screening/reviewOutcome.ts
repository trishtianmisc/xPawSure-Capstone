import type { ClaudeAnalysisStatus } from './types'

export type ReviewOutcome = 'run-gate' | 'preview-only' | 'abort'

/**
 * Maps a backend photo-review response to the screening flow branch.
 *
 * - 'run-gate': review succeeded with findings — validate them, then decide
 *   whether the classifier may run (approved) or the flow stops (rejected).
 * - 'preview-only': review backend not configured — no gate exists, the
 *   classifier runs for preview only and saving stays disabled downstream.
 * - 'abort': any other failure (timeout, rate limit, malformed, provider
 *   error, OK without findings) — screening does not run.
 */
export function classifyReviewOutcome(
  status: ClaudeAnalysisStatus,
  hasResult: boolean,
): ReviewOutcome {
  if (status === 'NOT_CONFIGURED') {
    return 'preview-only'
  }
  if (status === 'OK' && hasResult) {
    return 'run-gate'
  }
  return 'abort'
}
