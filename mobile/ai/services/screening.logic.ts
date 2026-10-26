/**
 * Pure post-inference screening rules (no React, no network, no TensorFlow).
 *
 * Pipeline role: consumed by tensorflow.service.runMultiScreening and the
 * result screens.
 *
 *  - MIN_VALID_IMAGES = 3: quality, Claude approval, and skin-validity gates
 *    all require all three photos to pass (zero tolerance for a failing photo).
 *  - buildImageReports(): per-photo status for result-screen badges, merging
 *    the on-device quality flag, the Claude validation decision, and the
 *    feature-similarity score.
 *  - decideScreeningState(): final state from counts of quality-passed,
 *    skin-valid photos and the mean skin similarity.
 *
 * Unit-tested in scripts/test-screening-logic.js.
 */
import type {
  ClaudeValidationDecision,
  ImageReport,
  ImageReportStatus,
  ScreeningResultState,
} from '../types/ai.types'

export const MIN_VALID_IMAGES = 3

export interface SimilarityThresholds {
  minSimilarity: number
  skinSimilarity: number
}

export interface RejectionCounts {
  quality: number
  notSkin: number
  lowSimilarity: number
  notValidated: number
  validationError: number
}

export function statusForSimilarity(
  qualityOk: boolean,
  similarity: number,
  thresholds: SimilarityThresholds,
): ImageReportStatus {
  if (!qualityOk) return 'quality_failed'
  if (similarity < thresholds.minSimilarity) return 'low_similarity'
  if (similarity < thresholds.skinSimilarity) return 'not_skin'
  return 'ok'
}

function resolveImageReportStatus(
  qualityOk: boolean,
  similarity: number | null,
  claude: ClaudeValidationDecision | null | undefined,
  thresholds: SimilarityThresholds,
): ImageReportStatus {
  if (!qualityOk) return 'quality_failed'

  if (!claude) {
    return statusForSimilarity(qualityOk, similarity ?? 0, thresholds)
  }

  if (claude.status === 'NOT_VALIDATED') return 'not_validated'

  if (!claude.approved) {
    if (claude.status !== 'OK') return 'validation_error'
    return claude.suitability === 'POOR_QUALITY' ? 'quality_failed' : 'not_skin'
  }

  if (similarity === null) return 'ok'
  return statusForSimilarity(true, similarity, thresholds)
}

export function buildImageReports(
  imageUris: string[],
  qualityFlags: boolean[],
  similarities: (number | null)[] | null,
  thresholds: SimilarityThresholds,
  claude: (ClaudeValidationDecision | null)[] | null = null,
): ImageReport[] {
  return imageUris.map((uri, index) => {
    const qualityOk = qualityFlags[index] ?? false
    const similarity = similarities?.[index] ?? null
    const claudeDecision = claude?.[index] ?? null

    const report: ImageReport = {
      uri,
      status: resolveImageReportStatus(qualityOk, similarity, claudeDecision, thresholds),
      similarity,
    }

    if (claudeDecision && qualityOk) {
      report.claudeStatus = claudeDecision.status
      if (claudeDecision.message) {
        report.claudeMessage = claudeDecision.message
      }
    }

    return report
  })
}

export function selectValidIndices(similarities: number[], threshold: number): number[] {
  return similarities
    .map((similarity, index) => ({ similarity, index }))
    .filter(({ similarity }) => similarity >= threshold)
    .map(({ index }) => index)
}

export function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function decideScreeningState(
  qualityOkCount: number,
  skinValidCount: number,
  meanSkinSimilarity: number,
  skinSimilarityThreshold: number,
): ScreeningResultState {
  if (qualityOkCount < MIN_VALID_IMAGES) return 'INVALID_IMAGE'
  if (skinValidCount < MIN_VALID_IMAGES) return 'NOT_SKIN_IMAGE'
  if (meanSkinSimilarity < skinSimilarityThreshold) return 'UNCERTAIN'
  return 'DISEASE_DETECTED'
}

export function countRejectedReports(reports: ImageReport[]): RejectionCounts {
  const counts: RejectionCounts = {
    quality: 0,
    notSkin: 0,
    lowSimilarity: 0,
    notValidated: 0,
    validationError: 0,
  }

  for (const report of reports) {
    if (report.status === 'quality_failed') counts.quality += 1
    if (report.status === 'not_skin') counts.notSkin += 1
    if (report.status === 'low_similarity') counts.lowSimilarity += 1
    if (report.status === 'not_validated') counts.notValidated += 1
    if (report.status === 'validation_error') counts.validationError += 1
  }

  return counts
}
