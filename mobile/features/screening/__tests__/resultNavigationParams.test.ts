import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildResultNavigationParams } from '../resultNavigationParams.ts'
import type { Answers, StoppingDecision } from '../../../ai/decisionTree/types.ts'

const decision: StoppingDecision = {
  shouldStop: true,
  reason: 'criteria-met',
  answeredCount: 4,
  totalQuestions: 12,
  leading: 'MANGE',
  runnerUp: 'FUNGAL',
  leadingProbability: 0.72,
  runnerUpProbability: 0.18,
  margin: 0.54,
  informativeGroups: 3,
  stableInformativeUpdates: 1,
  criteria: {
    leadingPosterior: true,
    top2Margin: true,
    informativeGroups: true,
    stability: false,
  },
}

const AI_PREDICTIONS = JSON.stringify([
  { disease: 'MANGE', confidence: 87.4, label: 'Mange' },
  { disease: 'FUNGAL', confidence: 6.1, label: 'Fungal' },
])

const answers: Answers = {
  q_itching: ['opt_severe'],
  q_distribution: ['opt_generalized', 'opt_paws'],
}

describe('buildResultNavigationParams', () => {
  const params = buildResultNavigationParams(
    {
      predictions: AI_PREDICTIONS,
      petId: 'pet-1',
      petName: 'Buddy',
      imageUri: 'file:///photo.jpg',
      modelVersion: '2.0.0',
      inferenceTimeMs: '412',
      claude: '{"status":"OK"}',
      claudeRequestFailed: 'false',
      deviceFailed: 'false',
      classifierSkipped: 'false',
    },
    answers,
    decision,
  )

  it('forwards the AI predictions byte-for-byte', () => {
    assert.equal(params.predictions, AI_PREDICTIONS)
  })

  it('has no keys capable of carrying a modified prediction', () => {
    assert.equal('refined' in params, false)
    assert.equal('questionnaireOnly' in params, false)
    assert.equal('changed' in params, false)
    assert.equal('refinementMethod' in params, false)
  })

  it('passes the questionnaire answers as supplementary context', () => {
    assert.deepEqual(JSON.parse(params.answers), answers)
  })

  it('carries the stopping decision metadata', () => {
    assert.equal(params.stoppingReason, 'criteria-met')
    assert.equal(params.answeredCount, '4')
    assert.equal(params.totalQuestions, '12')
  })

  it('preserves pass-through context and defaults', () => {
    assert.equal(params.petId, 'pet-1')
    assert.equal(params.petName, 'Buddy')
    assert.equal(params.imageUri, 'file:///photo.jpg')
    assert.equal(params.modelVersion, '2.0.0')
    assert.equal(params.inferenceTimeMs, '412')
    assert.equal(params.claude, '{"status":"OK"}')
    assert.equal(params.claudeRequestFailed, 'false')
    assert.equal(params.deviceFailed, 'false')
    assert.equal(params.classifierSkipped, 'false')
    assert.equal(params.state, 'DISEASE_DETECTED')
    assert.equal(params.alreadySaved, 'false')
  })

  it('defaults optional context to safe values', () => {
    const minimal = buildResultNavigationParams(
      { predictions: '[]', petId: 'p', petName: 'n' },
      {},
      { ...decision, reason: null, answeredCount: 0 },
    )
    assert.equal(minimal.imageUri, '')
    assert.equal(minimal.modelVersion, '')
    assert.equal(minimal.inferenceTimeMs, '0')
    assert.equal(minimal.claude, '')
    assert.equal(minimal.stoppingReason, '')
    assert.equal(minimal.answeredCount, '0')
  })
})
