import type { ClaudeAnalysisResponse, ClaudeFindings } from './types'

export function isClaudeValidationApproved(
  response: ClaudeAnalysisResponse | null,
): response is ClaudeAnalysisResponse & { result: ClaudeFindings } {
  return (
    response?.status === 'OK' &&
    response.result?.image_suitability === 'SUITABLE' &&
    response.result.screening_eligibility === 'ELIGIBLE'
  )
}
