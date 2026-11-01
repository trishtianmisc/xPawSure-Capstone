import type { Answers, StoppingDecision } from '../../ai/decisionTree/types'

/**
 * Raw navigation context forwarded from the screening capture screen.
 * These values are passed through untouched; nothing here derives from
 * the questionnaire.
 */
export interface ResultNavigationContext {
  predictions: string
  petId: string
  petName: string
  imageUri?: string
  modelVersion?: string
  inferenceTimeMs?: string
  claude?: string
  claudeRequestFailed?: string
  deviceFailed?: string
  classifierSkipped?: string
}

/**
 * Builds the params handed from the questionnaire step to the result screen.
 *
 * Contract: the AI `predictions` string is forwarded byte-for-byte. The
 * questionnaire contributes `answers` as supplementary display context only —
 * there is intentionally no way to pass a modified prediction vector here.
 */
export function buildResultNavigationParams(
  ctx: ResultNavigationContext,
  answers: Answers,
  decision: StoppingDecision,
): Record<string, string> {
  return {
    imageUri: ctx.imageUri ?? '',
    petId: ctx.petId,
    petName: ctx.petName,
    predictions: ctx.predictions,
    modelVersion: ctx.modelVersion ?? '',
    inferenceTimeMs: ctx.inferenceTimeMs ?? '0',
    state: 'DISEASE_DETECTED',
    stateMessage: '',
    deviceFailed: ctx.deviceFailed ?? 'false',
    classifierSkipped: ctx.classifierSkipped ?? 'false',
    claude: ctx.claude ?? '',
    claudeRequestFailed: ctx.claudeRequestFailed ?? 'false',
    answers: JSON.stringify(answers),
    stoppingReason: decision.reason ?? '',
    answeredCount: String(decision.answeredCount),
    totalQuestions: String(decision.totalQuestions),
    alreadySaved: 'false',
  }
}
