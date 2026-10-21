import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  bayesUpdate,
  entropyBits,
  expectedInformationGain,
  normalizeDistribution,
  sigmoid,
  softmax,
  temperCategorical,
  temperProbability,
  topTwo,
} from '../math.ts'
import { DISEASES } from '../types.ts'
import { distribution, sum } from './helpers.ts'

const EPSILON = 1e-9

function close(actual: number, expected: number, tolerance = 1e-9): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  )
}

describe('entropy', () => {
  it('returns log2(5) for a uniform five-class distribution', () => {
    close(entropyBits(normalizeDistribution({})), Math.log2(5))
  })

  it('returns zero for a point mass', () => {
    close(entropyBits(distribution({ MANGE: 1 })), 0)
  })

  it('handles zero-probability classes without NaN', () => {
    const entropy = entropyBits(distribution({ MANGE: 0.5, FUNGAL: 0.5 }))
    close(entropy, 1)
  })
})

describe('normalisation', () => {
  it('treats missing, negative, NaN and infinite values safely', () => {
    const result = normalizeDistribution({
      MANGE: Number.NaN,
      FUNGAL: -1,
      HOTSPOT: Number.POSITIVE_INFINITY,
      BACTERIAL: 2,
      ALLERGIC_DERMATITIS: 2,
    })
    close(sum(result), 1)
    close(result.BACTERIAL, 0.5)
    close(result.ALLERGIC_DERMATITIS, 0.5)
    close(result.MANGE, 0)
    close(result.FUNGAL, 0)
    close(result.HOTSPOT, 0)
  })

  it('falls back to uniform when every value is zero', () => {
    const result = normalizeDistribution({})
    for (const disease of DISEASES) close(result[disease], 0.2)
  })
})

describe('Bayesian update', () => {
  it('updates a binary prior according to the likelihood ratio', () => {
    const prior = distribution({ MANGE: 0.5, FUNGAL: 0.5 })
    const { posterior } = bayesUpdate(prior, {
      MANGE: 0.8,
      FUNGAL: 0.2,
      HOTSPOT: 1e-12,
      BACTERIAL: 1e-12,
      ALLERGIC_DERMATITIS: 1e-12,
    })
    close(posterior.MANGE, 0.8)
    close(posterior.FUNGAL, 0.2)
    close(sum(posterior), 1)
  })

  it('keeps the prior when the likelihood vector carries no evidence', () => {
    const prior = distribution({ MANGE: 0.4, FUNGAL: 0.3, HOTSPOT: 0.3 })
    const { posterior } = bayesUpdate(prior, {
      MANGE: 1,
      FUNGAL: 1,
      HOTSPOT: 1,
      BACTERIAL: 1,
      ALLERGIC_DERMATITIS: 1,
    })
    for (const disease of DISEASES) close(posterior[disease], prior[disease])
  })

  it('does not emit NaN or underflow to all zeros for extreme values', () => {
    const prior = normalizeDistribution({
      MANGE: 1e-300,
      FUNGAL: 1e-300,
      HOTSPOT: 1e-300,
      BACTERIAL: 1e-300,
      ALLERGIC_DERMATITIS: 1e-300,
    })
    const { posterior } = bayesUpdate(prior, {
      MANGE: 1e-300,
      FUNGAL: 1,
      HOTSPOT: 1e-300,
      BACTERIAL: 1e-300,
      ALLERGIC_DERMATITIS: 1e-300,
    })
    close(sum(posterior), 1)
    for (const disease of DISEASES) {
      assert.ok(Number.isFinite(posterior[disease]), `${disease} is not finite`)
      assert.ok(posterior[disease] >= 0, `${disease} is negative`)
    }
    close(posterior.FUNGAL, 1, 1e-6)
  })

  it('returns the prior when every likelihood is zero', () => {
    const prior = distribution({ MANGE: 0.6, FUNGAL: 0.4 })
    const { posterior } = bayesUpdate(prior, {
      MANGE: 0,
      FUNGAL: 0,
      HOTSPOT: 0,
      BACTERIAL: 0,
      ALLERGIC_DERMATITIS: 0,
    })
    for (const disease of DISEASES) close(posterior[disease], prior[disease])
  })
})

describe('expected information gain', () => {
  it('equals the prior entropy for a perfect test', () => {
    const prior = normalizeDistribution({})
    const answerLikelihoods = DISEASES.map((disease) => {
      const likelihoods: Record<string, number> = {}
      for (const candidate of DISEASES) likelihoods[candidate] = candidate === disease ? 1 : 1e-12
      return likelihoods
    })
    close(expectedInformationGain(prior, answerLikelihoods), Math.log2(5), 1e-6)
  })

  it('is zero for a test whose answer likelihoods are identical across conditions', () => {
    const prior = normalizeDistribution({})
    const identical = { MANGE: 0.3, FUNGAL: 0.3, HOTSPOT: 0.3, BACTERIAL: 0.3, ALLERGIC_DERMATITIS: 0.3 }
    close(expectedInformationGain(prior, [identical, identical]), 0)
  })

  it('is non-negative and bounded by the prior entropy', () => {
    const prior = normalizeDistribution({ MANGE: 0.7, FUNGAL: 0.1, HOTSPOT: 0.1, BACTERIAL: 0.05, ALLERGIC_DERMATITIS: 0.05 })
    const gain = expectedInformationGain(prior, [
      { MANGE: 0.9, FUNGAL: 0.1, HOTSPOT: 1e-12, BACTERIAL: 1e-12, ALLERGIC_DERMATITIS: 1e-12 },
      { MANGE: 0.2, FUNGAL: 0.5, HOTSPOT: 0.2, BACTERIAL: 0.05, ALLERGIC_DERMATITIS: 0.05 },
    ])
    assert.ok(gain >= 0)
    assert.ok(gain <= entropyBits(prior) + EPSILON)
  })
})

describe('tempering', () => {
  it('moves a Bernoulli probability towards 0.5', () => {
    close(temperProbability(0.8, 0.5), 2 / 3)
    close(temperProbability(0.2, 0.5), 1 / 3)
  })

  it('renormalises a tempered categorical distribution', () => {
    const tempered = temperCategorical([0.8, 0.2], 0.5)
    close(tempered[0], 2 / 3)
    close(tempered[1], 1 / 3)
    close(tempered[0] + tempered[1], 1)
  })

  it('has stable softmax and sigmoid behaviour', () => {
    const probabilities = softmax([1000, 999, -1000])
    close(probabilities[0] + probabilities[1] + probabilities[2], 1)
    assert.ok(probabilities[0] > probabilities[1])
    close(sigmoid(0), 0.5)
    assert.ok(sigmoid(1000) <= 1)
    assert.ok(sigmoid(-1000) >= 0)
  })
})

describe('top-two selection', () => {
  it('breaks exact ties using the fixed disease order', () => {
    const { top, second } = topTwo(
      distribution({ ALLERGIC_DERMATITIS: 0.5, BACTERIAL: 0.5 }),
    )
    assert.equal(top, 'ALLERGIC_DERMATITIS')
    assert.equal(second, 'BACTERIAL')
  })
})
