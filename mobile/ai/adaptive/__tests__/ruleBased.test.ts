import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { DiseaseType, Prediction } from '../../types/ai.types.ts'

// `ai/constants/diseases.ts` calls `require` for the bundled model manifest at
// module load time. The test runner does not provide `require` in ESM, so stub
// it before importing the existing rule-based engine. This does not affect the
// application bundle.
;(globalThis as unknown as { require: (id: string) => unknown }).require = () => ({
  version: '2.0.0',
})

const { refinePredictions } = await import('../../decisionTree/engine.ts')
const { DISEASE_LABELS } = await import('../../constants/diseases.ts')
const { KNOWLEDGE } = await import('../../decisionTree/knowledge.ts')

const DISEASES = Object.keys(DISEASE_LABELS) as DiseaseType[]

function predictionsFor(
  disease: DiseaseType,
  confidence: number,
): Prediction[] {
  const remaining = (100 - confidence) / (DISEASES.length - 1)
  return DISEASES.map((candidate) => ({
    disease: candidate,
    confidence: candidate === disease ? confidence : Math.round(remaining * 100) / 100,
    label: DISEASE_LABELS[candidate],
  }))
}

function predictionsWith(
  values: Partial<Record<DiseaseType, number>>,
): Prediction[] {
  return DISEASES.map((disease) => ({
    disease,
    confidence: values[disease] ?? 0,
    label: DISEASE_LABELS[disease],
  }))
}

describe('rule-based fallback regression', () => {
  it('leaves predictions unchanged when no answers are supplied', () => {
    const predictions = predictionsFor('FUNGAL', 60)
    const result = refinePredictions(predictions, {}, KNOWLEDGE)

    assert.equal(result.changed, false)
    assert.equal(result.originalTop.disease, 'FUNGAL')
    assert.equal(result.refinedTop.disease, 'FUNGAL')
    assert.equal(result.refined.length, DISEASES.length)
    assert.deepEqual(
      result.refined.map((prediction) => prediction.disease),
      [...DISEASES].sort((a, b) => {
        const pa = predictions.find((item) => item.disease === a)?.confidence ?? 0
        const pb = predictions.find((item) => item.disease === b)?.confidence ?? 0
        return pb - pa
      }),
    )
  })

  it('applies the existing vet votes and reports a changed top condition', () => {
    // MANGE starts slightly behind FUNGAL. The ear-reflex question adds +30 to
    // MANGE and -20 to ALLERGIC_DERMATITIS, which is enough to flip the top.
    const predictions = predictionsWith({
      FUNGAL: 40,
      MANGE: 35,
      HOTSPOT: 10,
      BACTERIAL: 8,
      ALLERGIC_DERMATITIS: 7,
    })
    const result = refinePredictions(predictions, { ear_reflex: ['yes'] }, KNOWLEDGE)

    assert.equal(result.originalTop.disease, 'FUNGAL')
    assert.equal(result.refinedTop.disease, 'MANGE')
    assert.equal(result.changed, true)
    assert.equal(result.refined[0].disease, 'MANGE')
    assert.equal(result.refined[0].confidence, 65)
  })

  it('treats "Not sure" as no change to the rule-based scores', () => {
    const predictions = predictionsWith({
      FUNGAL: 40,
      MANGE: 35,
      HOTSPOT: 10,
      BACTERIAL: 8,
      ALLERGIC_DERMATITIS: 7,
    })
    const baseline = refinePredictions(predictions, {}, KNOWLEDGE)
    const unsure = refinePredictions(predictions, { ear_reflex: ['unsure'] }, KNOWLEDGE)

    assert.deepEqual(unsure.refined, baseline.refined)
    assert.equal(unsure.changed, false)
  })

  it('adds every selected multi-select location and clamps scores to 100', () => {
    const predictions = predictionsWith({
      MANGE: 95,
      FUNGAL: 2,
      HOTSPOT: 1,
      BACTERIAL: 1,
      ALLERGIC_DERMATITIS: 1,
    })
    const result = refinePredictions(
      predictions,
      { location: ['ears', 'face', 'elbows'] },
      KNOWLEDGE,
    )

    const MANGE = result.refined.find((prediction) => prediction.disease === 'MANGE')
    assert.ok(MANGE)
    assert.equal(MANGE.confidence, 100)
  })

  it('ignores unknown question and option ids instead of crashing', () => {
    const predictions = predictionsFor('HOTSPOT', 70)
    const result = refinePredictions(
      predictions,
      { not_a_question: ['yes'], ear_reflex: ['not_an_option'] },
      KNOWLEDGE,
    )

    assert.equal(result.changed, false)
    assert.equal(result.refinedTop.disease, 'HOTSPOT')
  })
})
