import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { determineScreeningState } from '../services/screeningState.ts'
import type { Prediction } from '../types/ai.types.ts'

const pred = (confidence: number, disease: Prediction['disease'] = 'BACTERIAL'): Prediction => ({
  disease,
  confidence,
  label: String(disease),
})

const predictions = (top1: number, top2 = 5): Prediction[] => [pred(top1), pred(top2, 'FUNGAL')]

describe('determineScreeningState', () => {
  it('returns UNCERTAIN for empty predictions even with perfect similarity', () => {
    const result = determineScreeningState([], 1.0)
    assert.equal(result.state, 'UNCERTAIN')
    assert.ok(result.stateMessage.length > 0)
  })

  it('returns NOT_SKIN_IMAGE below the minimum feature similarity', () => {
    const result = determineScreeningState(predictions(99.9), 0.09)
    assert.equal(result.state, 'NOT_SKIN_IMAGE')
  })

  it('returns DISEASE_DETECTED at the 0.50 similarity boundary even with low confidence', () => {
    const result = determineScreeningState(predictions(45.0), 0.50)
    assert.equal(result.state, 'DISEASE_DETECTED')
  })

  it('returns UNCERTAIN just below the 0.50 similarity boundary despite high confidence', () => {
    const result = determineScreeningState(predictions(99.0), 0.4999)
    assert.equal(result.state, 'UNCERTAIN')
  })

  it('ignores confidence entirely: every top1 yields DISEASE_DETECTED at high similarity', () => {
    for (const top1 of [0, 5, 40, 79.99, 99]) {
      const result = determineScreeningState(predictions(top1), 0.8)
      assert.equal(result.state, 'DISEASE_DETECTED', `top1=${top1}`)
    }
  })

  it('returns UNCERTAIN in the overlap zone even with high confidence', () => {
    const result = determineScreeningState(predictions(99.0), 0.30)
    assert.equal(result.state, 'UNCERTAIN')
  })

  it('does not mutate the input predictions array', () => {
    const input = predictions(85, 40)
    const copy = input.map((p) => ({ ...p }))
    determineScreeningState(input, 0.5)
    assert.deepEqual(input, copy)
  })

  it('produces deterministic results for identical inputs', () => {
    const a = determineScreeningState(predictions(88), 0.42)
    const b = determineScreeningState(predictions(88), 0.42)
    assert.deepEqual(a, b)
  })
})
