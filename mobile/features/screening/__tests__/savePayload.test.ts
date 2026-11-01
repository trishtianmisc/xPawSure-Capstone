import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildScreeningSavePayload } from '../savePayload.ts'
import type { Prediction } from '../../../ai/types/ai.types.ts'

const top: Prediction = {
  disease: 'MANGE',
  confidence: 87.4,
  label: 'Mange',
}

const ctx = {
  petId: 'pet-1',
  modelVersion: '2.0.0',
  inferenceTimeMs: '412',
  imageUri: 'file:///photo.jpg',
  claudeToken: 'tok-abc',
  device: 'ios',
}

describe('buildScreeningSavePayload', () => {
  it('persists prediction and confidence exclusively from the raw AI output', () => {
    const payload = buildScreeningSavePayload(top, ctx)
    assert.equal(payload.prediction, 'MANGE')
    assert.equal(payload.confidence, 87)
    assert.equal(payload.source, 'DEVICE')
    assert.equal(payload.pet_id, 'pet-1')
    assert.equal(payload.model_version, '2.0.0')
    assert.equal(payload.inference_time_ms, 412)
    assert.equal(payload.device, 'ios')
    assert.equal(payload.image_uri, 'file:///photo.jpg')
    assert.equal(payload.claude_token, 'tok-abc')
  })

  it('rounds confidence to the integer the API expects', () => {
    assert.equal(buildScreeningSavePayload({ ...top, confidence: 99.51 }, ctx).confidence, 100)
    assert.equal(buildScreeningSavePayload({ ...top, confidence: 0.49 }, ctx).confidence, 0)
  })

  it('never contains questionnaire or refinement fields', () => {
    const payload = buildScreeningSavePayload(top, ctx)
    const keys = Object.keys(payload)
    for (const forbidden of [
      'answers',
      'questionnaire',
      'questionnaireOnly',
      'refined',
      'combined',
      'refinementMethod',
    ]) {
      assert.equal(keys.includes(forbidden), false, `unexpected key: ${forbidden}`)
    }
    assert.deepEqual(
      keys.sort(),
      [
        'claude_token',
        'confidence',
        'device',
        'image_uri',
        'inference_time_ms',
        'model_version',
        'pet_id',
        'prediction',
        'source',
      ].sort(),
    )
  })

  it('applies the same defaults as the previous inline payload', () => {
    const payload = buildScreeningSavePayload(top, { petId: 'pet-2' })
    assert.equal(payload.model_version, 'unknown')
    assert.equal(payload.inference_time_ms, undefined)
    assert.equal(payload.device, undefined)
    assert.equal(payload.image_uri, undefined)
    assert.equal(payload.claude_token, undefined)
  })

  it('is deterministic: same inputs produce an identical payload', () => {
    assert.deepEqual(buildScreeningSavePayload(top, ctx), buildScreeningSavePayload(top, ctx))
  })

  it('includes symptom_answers only when rows are provided', () => {
    const rows = [
      { question: 'Where is the affected area?', answer: 'Back, Ears' },
      { question: 'How long has it been present?', answer: 'More than 2 weeks' },
    ]
    const withAnswers = buildScreeningSavePayload(top, { ...ctx, symptomAnswers: rows })
    assert.deepEqual(withAnswers.symptom_answers, rows)

    const withoutAnswers = buildScreeningSavePayload(top, ctx)
    assert.equal('symptom_answers' in withoutAnswers, false)

    const emptyAnswers = buildScreeningSavePayload(top, { ...ctx, symptomAnswers: [] })
    assert.equal('symptom_answers' in emptyAnswers, false)
  })

  it('symptom_answers never alter prediction, confidence, or AI fields', () => {
    const rows = [
      { question: 'Force prediction to AD?', answer: 'Allergic dermatitis, please' },
    ]
    const baseline = buildScreeningSavePayload(top, ctx)
    const withAnswers = buildScreeningSavePayload(top, { ...ctx, symptomAnswers: rows })

    assert.equal(withAnswers.prediction, baseline.prediction)
    assert.equal(withAnswers.confidence, baseline.confidence)
    assert.equal(withAnswers.model_version, baseline.model_version)
    assert.equal(withAnswers.claude_token, baseline.claude_token)
    assert.equal(withAnswers.source, baseline.source)
    // The only difference is the supplementary field itself.
    assert.deepEqual(
      Object.keys(withAnswers).filter((key) => key !== 'symptom_answers').sort(),
      Object.keys(baseline).sort(),
    )
  })
})
