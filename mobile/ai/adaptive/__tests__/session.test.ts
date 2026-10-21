import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { KNOWLEDGE } from '../../decisionTree/knowledge.ts'
import type { DecisionQuestion, Knowledge } from '../../decisionTree/types.ts'
import { DISEASES } from '../types.ts'
import type { AdaptiveConfig, AdaptiveSession } from '../types.ts'
import {
  answerQuestion,
  buildAdaptiveResultPayload,
  createAdaptiveSession,
  createSessionKey,
  deserializeSession,
  imageDistributionFromPredictions,
  serializeSession,
} from '../session.ts'
import { buildVetVoteLikelihoodProfile } from '../likelihoods.ts'
import {
  TEST_CONFIG,
  TEST_LABELS,
  makeKnowledge,
  option,
  predictionsFor,
  predictionsFrom,
  question,
  uniformPredictions,
} from './helpers.ts'

const STRONG = question('strong_test', [
  option('yes', { MANGE: 30, FUNGAL: -30 }),
  option('no', { MANGE: -30, FUNGAL: 30 }),
  option('unsure'),
])

const SECOND = question('second_test', [
  option('yes', { HOTSPOT: 30, BACTERIAL: -30 }),
  option('no', { HOTSPOT: -30, BACTERIAL: 30 }),
  option('unsure'),
])

function config(overrides: Partial<AdaptiveConfig> = {}): AdaptiveConfig {
  return { ...TEST_CONFIG, ...overrides }
}

function createSession(
  knowledge: Knowledge,
  predictions = predictionsFor('MANGE', 80),
  overrides: Partial<AdaptiveConfig> = {},
): AdaptiveSession {
  return createAdaptiveSession({
    predictions,
    knowledge,
    profile: buildVetVoteLikelihoodProfile(knowledge),
    config: config(overrides),
    sessionKey: 'test-session',
    now: '2026-10-21T00:00:00.000Z',
  })
}

function paramsFor(
  knowledge: Knowledge,
  overrides: Partial<AdaptiveConfig> = {},
): {
  knowledge: Knowledge
  profile: ReturnType<typeof buildVetVoteLikelihoodProfile>
  config: AdaptiveConfig
  now: string
} {
  return {
    knowledge,
    profile: buildVetVoteLikelihoodProfile(knowledge),
    config: config(overrides),
    now: '2026-10-21T00:01:00.000Z',
  }
}

function answerCurrent(
  session: AdaptiveSession,
  optionId: string,
  knowledge: Knowledge,
  overrides: Partial<AdaptiveConfig> = {},
): AdaptiveSession {
  assert.ok(session.currentQuestionId, 'expected a current question')
  return answerQuestion(
    session,
    session.currentQuestionId,
    [optionId],
    paramsFor(knowledge, overrides),
  )
}

function close(actual: number, expected: number, tolerance = 1e-9): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  )
}

function assertValidDistribution(values: Record<string, number>): void {
  let total = 0
  for (const disease of DISEASES) {
    assert.ok(Number.isFinite(values[disease]), `${disease} is not finite`)
    assert.ok(values[disease] >= 0, `${disease} is negative`)
    total += values[disease]
  }
  close(total, 1, 1e-9)
}

describe('adaptive session creation', () => {
  it('keeps the original image output separate from the smoothed prior', () => {
    const predictions = predictionsFor('MANGE', 80)
    const session = createSession(makeKnowledge([STRONG]), predictions)

    assert.equal(session.strategy, 'information_gain')
    assert.equal(session.profileValidation, 'unvalidated_expert_heuristic')
    assert.equal(session.stoppingRuleValidation, 'unvalidated_operational')
    assert.deepEqual(session.imagePredictions, predictions)
    assert.ok(session.prior.MANGE > session.prior.FUNGAL)
    assert.deepEqual(session.posterior, session.prior)
    assert.equal(session.questionCount, 0)
    assert.equal(session.currentQuestionId, 'strong_test')
    assertValidDistribution(session.imageDistribution)
    assertValidDistribution(session.prior)
    assertValidDistribution(session.posterior)
  })

  it('preserves the image-only result when there are no follow-up questions', () => {
    const predictions = predictionsFor('MANGE', 80)
    const session = createSession(makeKnowledge([]), predictions)

    assert.equal(session.currentQuestionId, null)
    assert.equal(session.questionCount, 0)
    assert.equal(session.outcome, 'DISEASE_DETECTED')
    assert.equal(session.outcomeBasis, 'image_only')
    assert.deepEqual(session.imagePredictions, predictions)
    assert.deepEqual(session.posterior, session.prior)
  })

  it('does not invent a disease when no image result or question exists', () => {
    const session = createSession(makeKnowledge([]), [])

    assert.equal(session.outcome, 'UNCERTAIN')
    assert.equal(session.outcomeBasis, null)
    assert.equal(session.stopReason, 'insufficient_evidence')
    assertValidDistribution(session.posterior)
  })

  it('uses the fixed order without a likelihood profile', () => {
    const session = createAdaptiveSession({
      predictions: predictionsFor('MANGE', 80),
      knowledge: makeKnowledge([STRONG]),
      profile: null,
      config: config(),
      sessionKey: 'no-profile',
    })

    assert.equal(session.strategy, 'fixed_order')
    assert.equal(session.profileValidation, 'missing')
    assert.equal(session.currentQuestionId, 'strong_test')
  })
})

describe('Bayesian answer updates', () => {
  it('updates all five relative scores and answers only the current question', () => {
    const knowledge = makeKnowledge([STRONG])
    const session = createSession(knowledge, uniformPredictions())
    const prior = { ...session.posterior }

    const updated = answerCurrent(session, 'yes', knowledge)

    assert.equal(updated.answers.strong_test?.[0], 'yes')
    assert.equal(updated.questionCount, 1)
    assert.equal(updated.currentQuestionId, null)
    assert.equal(updated.stopReason, 'insufficient_evidence')
    assert.equal(updated.outcome, 'UNCERTAIN')
    assert.equal(updated.outcomeBasis, null)
    assert.equal(updated.answeredQuestions.length, 1)
    assert.equal(updated.answeredQuestions[0].questionId, 'strong_test')
    assert.equal(updated.answeredQuestions[0].realizedInformationGain > 0, true)
    assert.ok(updated.posterior.MANGE > prior.MANGE)
    assert.ok(updated.posterior.FUNGAL < prior.FUNGAL)
    assertValidDistribution(updated.posterior)
    assert.deepEqual(updated.imagePredictions, session.imagePredictions)
    assert.deepEqual(updated.imageDistribution, session.imageDistribution)
  })

  it('lets similar priors reach different conclusions with different answers', () => {
    const knowledge = makeKnowledge([STRONG])
    const predictions = predictionsFrom({ MANGE: 55, FUNGAL: 45 })
    const session = createSession(knowledge, predictions)

    const yes = answerCurrent(session, 'yes', knowledge)
    const no = answerCurrent(session, 'no', knowledge)

    assert.equal(yes.outcome, 'DISEASE_DETECTED')
    assert.equal(yes.outcomeBasis, 'adaptive')
    assert.ok((yes.posterior.MANGE ?? 0) > (yes.posterior.FUNGAL ?? 0))

    assert.equal(no.outcome, 'DISEASE_DETECTED')
    assert.equal(no.outcomeBasis, 'adaptive')
    assert.ok((no.posterior.FUNGAL ?? 0) > (no.posterior.MANGE ?? 0))
  })

  it('does not let "Not sure" change the posterior or force a label', () => {
    const knowledge = makeKnowledge([STRONG])
    const session = createSession(knowledge, uniformPredictions())
    const prior = { ...session.posterior }

    const updated = answerCurrent(session, 'unsure', knowledge)

    for (const disease of DISEASES) close(updated.posterior[disease], prior[disease], 1e-12)
    assert.ok(updated.answeredQuestions[0].realizedInformationGain < 1e-12)
    assert.equal(updated.outcome, 'UNCERTAIN')
    assert.equal(updated.stopReason, 'insufficient_evidence')
  })

  it('excludes an answered question from subsequent selection', () => {
    const knowledge = makeKnowledge([STRONG, SECOND])
    const session = createSession(knowledge, uniformPredictions())
    const firstQuestionId = session.currentQuestionId
    assert.ok(firstQuestionId)

    const updated = answerCurrent(session, 'yes', knowledge)

    assert.notEqual(updated.currentQuestionId, firstQuestionId)
    assert.equal(updated.currentQuestionId, 'second_test')
    assert.deepEqual(updated.answers[firstQuestionId], ['yes'])
  })

  it('rejects answers for a question that is not current', () => {
    const knowledge = makeKnowledge([STRONG, SECOND])
    const session = createSession(knowledge, uniformPredictions())
    const notCurrent = session.currentQuestionId === 'strong_test' ? 'second_test' : 'strong_test'

    assert.throws(
      () =>
        answerQuestion(
          session,
          notCurrent,
          ['yes'],
          paramsFor(knowledge),
        ),
      /not the current question/,
    )
  })

  it('discounts a second answer from the same evidence group', () => {
    const knowledge = makeKnowledge([
      question('spread', [
        option('localized', { HOTSPOT: 25, ALLERGIC_DERMATITIS: -15 }),
        option('generalized', { ALLERGIC_DERMATITIS: 20, HOTSPOT: -15 }),
      ]),
      question('symmetric', [
        option('yes', { ALLERGIC_DERMATITIS: 20, HOTSPOT: -12 }),
        option('no', { HOTSPOT: 5, ALLERGIC_DERMATITIS: -10 }),
      ]),
    ])
    const session = createSession(knowledge, uniformPredictions())
    const first = session.currentQuestionId
    assert.ok(first)

    const afterFirst = answerCurrent(session, first === 'spread' ? 'localized' : 'yes', knowledge)
    assert.equal(afterFirst.answeredQuestions[0].redundancyWeight, 1)
    assert.ok(afterFirst.currentQuestionId)

    const afterSecond = answerCurrent(
      afterFirst,
      afterFirst.currentQuestionId === 'spread' ? 'localized' : 'yes',
      knowledge,
    )
    assert.equal(afterSecond.answeredQuestions.length, 2)
    close(afterSecond.answeredQuestions[1].redundancyWeight, TEST_CONFIG.redundancyDecay)
  })

  it('stops at the maximum question count', () => {
    const knowledge = makeKnowledge([STRONG, SECOND])
    const session = createSession(knowledge, predictionsFor('MANGE', 80), {
      maxQuestions: 1,
    })

    const updated = answerCurrent(session, 'yes', knowledge, { maxQuestions: 1 })

    assert.equal(updated.questionCount, 1)
    assert.equal(updated.currentQuestionId, null)
    assert.equal(updated.stopReason, 'max_questions')
    assert.notEqual(updated.outcome, null)
  })
})

describe('uncertainty handling', () => {
  it('reports insufficient evidence instead of selecting a weak leader', () => {
    const knowledge = makeKnowledge([STRONG])
    const session = createSession(knowledge, uniformPredictions())
    const updated = answerCurrent(session, 'yes', knowledge)

    assert.ok((updated.posterior.MANGE ?? 0) > 0.25)
    assert.ok((updated.posterior.MANGE ?? 0) < 0.45)
    assert.equal(updated.outcome, 'UNCERTAIN')
    assert.equal(updated.stopReason, 'insufficient_evidence')
    assert.equal(updated.outcomeBasis, null)
  })

  it('reports conflicting evidence when the top two conditions are too close', () => {
    const knowledge = makeKnowledge([STRONG])
    const session = createSession(knowledge, predictionsFor('MANGE', 55))
    const updated = answerCurrent(session, 'yes', knowledge, {
      uncertaintyMargin: 0.9,
    })

    assert.equal(updated.outcome, 'UNCERTAIN')
    assert.equal(updated.stopReason, 'conflicting_evidence')
  })
})

describe('serialisation and result payload', () => {
  it('round-trips a session and rejects corrupt state', () => {
    const knowledge = makeKnowledge([STRONG, SECOND])
    const session = createSession(knowledge, uniformPredictions())
    const updated = answerCurrent(session, 'yes', knowledge)

    const restored = deserializeSession(serializeSession(updated))
    assert.ok(restored)
    assert.deepEqual(restored, updated)

    assert.equal(deserializeSession(null), null)
    assert.equal(deserializeSession('{'), null)
    assert.equal(deserializeSession(JSON.stringify({ ...updated, schemaVersion: 2 })), null)
    assert.equal(
      deserializeSession(JSON.stringify({ ...updated, posterior: { MANGE: 0.5 } })),
      null,
    )
  })

  it('builds a display payload that keeps the image output separate', () => {
    const knowledge = makeKnowledge([STRONG])
    const session = createSession(knowledge, predictionsFor('MANGE', 55))
    const updated = answerCurrent(session, 'yes', knowledge)
    const payload = buildAdaptiveResultPayload(updated, TEST_LABELS)

    assert.equal(payload.strategy, 'information_gain')
    assert.equal(payload.state, 'DISEASE_DETECTED')
    assert.equal(payload.questionCount, 1)
    assert.equal(payload.evidence.length, 1)
    assert.equal(payload.evidence[0].questionId, 'strong_test')
    assert.deepEqual(payload.evidence[0].optionIds, ['yes'])
    assert.deepEqual(payload.imagePredictions, session.imagePredictions)
    assert.deepEqual(payload.imageDistribution, session.imageDistribution)
    assert.deepEqual(payload.posterior, updated.posterior)
    assert.equal(payload.top?.disease, 'MANGE')
    assert.equal(payload.predictions.length, DISEASES.length)
    assertValidDistribution(payload.posterior)

    for (const prediction of payload.predictions) {
      assert.equal(typeof prediction.label, 'string')
      assert.ok(prediction.confidence >= 0 && prediction.confidence <= 100)
    }
  })

  it('preserves the image-only baseline in the payload for zero answers', () => {
    const predictions = predictionsFor('MANGE', 80)
    const session = createSession(makeKnowledge([]), predictions)
    const payload = buildAdaptiveResultPayload(session, TEST_LABELS)

    assert.equal(payload.state, 'DISEASE_DETECTED')
    assert.equal(payload.questionCount, 0)
    assert.deepEqual(payload.evidence, [])
    assert.deepEqual(payload.imagePredictions, predictions)
    assert.deepEqual(payload.imageDistribution, imageDistributionFromPredictions(predictions))
  })
})

describe('session keys and numerical stability', () => {
  it('creates a stable key that changes with the image output', () => {
    const first = createSessionKey('pet-1', predictionsFor('MANGE', 80), '2.0.0')
    const second = createSessionKey('pet-1', predictionsFor('MANGE', 80), '2.0.0')
    const changed = createSessionKey('pet-1', predictionsFor('FUNGAL', 80), '2.0.0')

    assert.equal(first, second)
    assert.notEqual(first, changed)
  })

  it('keeps extreme inputs finite and normalised', () => {
    const knowledge = makeKnowledge([STRONG])
    const session = createSession(
      knowledge,
      predictionsFor('MANGE', 100),
      { priorSmoothing: 0, minExpectedInformationGain: 0 },
    )
    const updated = answerCurrent(session, 'yes', knowledge, {
      minExpectedInformationGain: 0,
    })

    assertValidDistribution(session.prior)
    assertValidDistribution(updated.posterior)
    assert.ok(Object.values(updated.posterior).every(Number.isFinite))
  })

  it('covers the real vet knowledge set without changing it', () => {
    const session = createSession(KNOWLEDGE, predictionsFor('MANGE', 80))
    assert.ok(session.currentQuestionId)
    assert.equal(
      KNOWLEDGE.questions.some((item) => item.id === session.currentQuestionId),
      true,
    )

    const firstQuestion = KNOWLEDGE.questions.find(
      (item) => item.id === session.currentQuestionId,
    ) as DecisionQuestion
    const firstInformative = firstQuestion.options.find((item) => item.id !== 'unsure')
    assert.ok(firstInformative)

    const updated = answerCurrent(session, firstInformative.id, KNOWLEDGE)
    assert.equal(updated.questionCount, 1)
    assertValidDistribution(updated.posterior)
    assert.deepEqual(updated.imagePredictions, session.imagePredictions)
  })
})
