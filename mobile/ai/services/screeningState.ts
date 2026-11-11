import {
  CONFIDENCE_THRESHOLDS,
  SCREENING_THRESHOLDS,
  SCREENING_STATE_MESSAGES,
} from '../constants/screening'
import type { Prediction, ScreeningResultState } from '../types/ai.types'

/**
 * Decides the screening state from the raw on-device outputs.
 *
 * Rules (fail-closed):
 * - No predictions → UNCERTAIN (never a positive result).
 * - Very low feature similarity → NOT_SKIN_IMAGE.
 * - High feature similarity AND top-1 confidence at or above the documented
 *   moderate threshold (0.80, see docs/architecture/AI_MODULE.md §12) →
 *   DISEASE_DETECTED.
 * - High similarity but low confidence, or the overlap zone → UNCERTAIN.
 *
 * Pure: questionnaire answers and the Claude review never reach this function;
 * it only reads the classifier's own predictions and feature similarity.
 */
export function determineScreeningState(
  predictions: readonly Prediction[],
  featureSimilarity: number,
): { state: ScreeningResultState; stateMessage: string } {
  const sorted = [...predictions].sort((a, b) => b.confidence - a.confidence)

  if (sorted.length === 0) {
    console.log('[TF SCREENING] UNCERTAIN: no predictions available (fail-closed)')
    return { state: 'UNCERTAIN', stateMessage: SCREENING_STATE_MESSAGES.UNCERTAIN.message }
  }

  const top1 = sorted[0].confidence / 100
  const top2 = sorted[1] ? sorted[1].confidence / 100 : 0
  const margin = top1 - top2

  const probs = new Float32Array(sorted.map((p) => p.confidence / 100))
  const entropy = probs.reduce((acc, p) => (p > 0 ? acc - p * Math.log2(p) : acc), 0)

  console.log(
    `[TF SCREENING] Top1=${(top1 * 100).toFixed(1)}% Top2=${(top2 * 100).toFixed(1)}% ` +
      `Margin=${(margin * 100).toFixed(1)}% Entropy=${entropy.toFixed(3)} ` +
      `Similarity=${featureSimilarity.toFixed(3)}`,
  )

  if (featureSimilarity >= SCREENING_THRESHOLDS.FEATURE_SIMILARITY_HIGH) {
    if (top1 >= CONFIDENCE_THRESHOLDS.MODERATE) {
      console.log(
        `[TF SCREENING] DISEASE_DETECTED: similarity ${featureSimilarity.toFixed(3)} >= ` +
          `${SCREENING_THRESHOLDS.FEATURE_SIMILARITY_HIGH} and top1 ` +
          `${(top1 * 100).toFixed(1)}% >= ${CONFIDENCE_THRESHOLDS.MODERATE * 100}%`,
      )
      return { state: 'DISEASE_DETECTED', stateMessage: SCREENING_STATE_MESSAGES.DISEASE_DETECTED.message }
    }
    console.log(
      `[TF SCREENING] UNCERTAIN (fail-closed): similarity ${featureSimilarity.toFixed(3)} >= ` +
        `${SCREENING_THRESHOLDS.FEATURE_SIMILARITY_HIGH} but top1 ` +
        `${(top1 * 100).toFixed(1)}% < ${CONFIDENCE_THRESHOLDS.MODERATE * 100}%`,
    )
    return { state: 'UNCERTAIN', stateMessage: SCREENING_STATE_MESSAGES.UNCERTAIN.message }
  }

  if (featureSimilarity < SCREENING_THRESHOLDS.FEATURE_SIMILARITY_MIN) {
    console.log(
      `[TF SCREENING] NOT_SKIN_IMAGE: similarity ${featureSimilarity.toFixed(3)} < ` +
        `${SCREENING_THRESHOLDS.FEATURE_SIMILARITY_MIN} threshold`,
    )
    return { state: 'NOT_SKIN_IMAGE', stateMessage: SCREENING_STATE_MESSAGES.NOT_SKIN_IMAGE.message }
  }

  console.log(
    `[TF SCREENING] UNCERTAIN: similarity ${featureSimilarity.toFixed(3)} in overlap zone ` +
      `[${SCREENING_THRESHOLDS.FEATURE_SIMILARITY_MIN}, ${SCREENING_THRESHOLDS.FEATURE_SIMILARITY_HIGH})`,
  )
  return { state: 'UNCERTAIN', stateMessage: SCREENING_STATE_MESSAGES.UNCERTAIN.message }
}
