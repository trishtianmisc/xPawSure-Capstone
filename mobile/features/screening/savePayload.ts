import type { Prediction } from '../../ai/types/ai.types'
import type { CreateScreeningPayload } from './types'

export interface SaveScreeningContext {
  petId: string
  modelVersion?: string
  inferenceTimeMs?: string
  imageUri?: string
  claudeToken?: string
  device?: string
  /** Display-ready supplementary rows shown on the result/details screens. */
  symptomAnswers?: { question: string; answer: string }[]
}

/**
 * Builds the screening save payload from the raw AI top prediction.
 *
 * Contract: `prediction` and `confidence` come exclusively from the on-device
 * classifier output. `symptomAnswers` is stored only as supplementary
 * display data on the server and can never influence the persisted
 * prediction, confidence, ranking, review status, or booking.
 */
export function buildScreeningSavePayload(
  top: Prediction,
  ctx: SaveScreeningContext,
): CreateScreeningPayload {
  const hasSymptomAnswers = !!ctx.symptomAnswers && ctx.symptomAnswers.length > 0
  return {
    pet_id: ctx.petId,
    source: 'DEVICE',
    prediction: top.disease,
    confidence: Math.round(top.confidence),
    model_version: ctx.modelVersion || 'unknown',
    inference_time_ms: Number(ctx.inferenceTimeMs) || undefined,
    device: ctx.device,
    image_uri: ctx.imageUri,
    claude_token: ctx.claudeToken,
    ...(hasSymptomAnswers ? { symptom_answers: ctx.symptomAnswers } : {}),
  }
}
