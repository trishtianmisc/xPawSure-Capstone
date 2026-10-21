import type {
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

export function buildImageReports(
  imageUris: string[],
  qualityFlags: boolean[],
  similarities: number[] | null,
  thresholds: SimilarityThresholds,
): ImageReport[] {
  let similarityIndex = 0

  return imageUris.map((uri, index) => {
    const qualityOk = qualityFlags[index] ?? false
    const similarity = qualityOk ? similarities?.[similarityIndex++] ?? 0 : 0

    return {
      uri,
      status: statusForSimilarity(qualityOk, similarity, thresholds),
      similarity,
    }
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
  }

  for (const report of reports) {
    if (report.status === 'quality_failed') counts.quality += 1
    if (report.status === 'not_skin') counts.notSkin += 1
    if (report.status === 'low_similarity') counts.lowSimilarity += 1
  }

  return counts
}
