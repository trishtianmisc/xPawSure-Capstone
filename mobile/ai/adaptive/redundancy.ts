import type { Answers, Knowledge } from '../decisionTree/types.ts'
import type { AdaptiveConfig } from './types.ts'
import { evidenceGroupFor, VISUAL_EVIDENCE_QUESTION_IDS } from './config.ts'

/**
 * Count how many questions from the same evidence group have already been
 * answered. The candidate itself is excluded so the first answer in a group
 * receives the full likelihood weight.
 */
export function countAnsweredInGroup(
  questionId: string,
  answers: Answers,
  knowledge: Knowledge,
): number {
  const group = evidenceGroupFor(questionId)
  return knowledge.questions.filter((question) => {
    if (question.id === questionId) return false
    if (evidenceGroupFor(question.id) !== group) return false
    return (answers[question.id]?.length ?? 0) > 0
  }).length
}

/**
 * Weight applied to a question's likelihood contribution. The first answer in
 * an evidence group has weight 1. Subsequent correlated answers decay towards
 * `minRedundancyWeight`. This is an explicit heuristic for correlated symptom
 * groups, not a fitted covariance correction.
 */
export function redundancyWeightForQuestion(
  questionId: string,
  answers: Answers,
  knowledge: Knowledge,
  config: Pick<AdaptiveConfig, 'redundancyDecay' | 'minRedundancyWeight'>,
): number {
  const count = countAnsweredInGroup(questionId, answers, knowledge)
  const decay = Number.isFinite(config.redundancyDecay)
    ? Math.min(1, Math.max(0, config.redundancyDecay))
    : 0.7
  const minimum = Number.isFinite(config.minRedundancyWeight)
    ? Math.min(1, Math.max(0.01, config.minRedundancyWeight))
    : 0.4
  return Math.max(minimum, Math.pow(decay, count))
}

/**
 * Visual questions overlap with the image model. Temper their contribution so
 * the same visible sign is less likely to be counted twice. This is a
 * conservative, configurable assumption; no joint calibration data exists.
 */
export function visualEvidenceWeightForQuestion(
  questionId: string,
  config: Pick<AdaptiveConfig, 'visualEvidenceWeight'>,
): number {
  if (!VISUAL_EVIDENCE_QUESTION_IDS[questionId]) return 1
  const weight = config.visualEvidenceWeight
  if (!Number.isFinite(weight)) return 1
  return Math.min(1, Math.max(0.01, weight))
}

export function combinedEvidenceWeight(
  questionId: string,
  answers: Answers,
  knowledge: Knowledge,
  config: Pick<
    AdaptiveConfig,
    'redundancyDecay' | 'minRedundancyWeight' | 'visualEvidenceWeight'
  >,
): { redundancy: number; visual: number; combined: number } {
  const redundancy = redundancyWeightForQuestion(questionId, answers, knowledge, config)
  const visual = visualEvidenceWeightForQuestion(questionId, config)
  return {
    redundancy,
    visual,
    combined: redundancy * visual,
  }
}
