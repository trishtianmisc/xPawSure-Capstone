import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildVetVoteLikelihoodProfile } from '../likelihoods.ts'
import {
  isQuestionApplicable,
  questionInformationGain,
  resolveStrategy,
  selectNextQuestion,
} from '../selector.ts'
import { combinedEvidenceWeight, redundancyWeightForQuestion } from '../redundancy.ts'
import type { AdaptiveConfig, ApplicabilityRules } from '../types.ts'
import {
  TEST_CONFIG,
  distribution,
  makeKnowledge,
  option,
  question,
} from './helpers.ts'

const STRONG = question('strong', [
  option('yes', { MANGE: 30, FUNGAL: -30 }),
  option('no', { MANGE: -30, FUNGAL: 30 }),
  option('unsure'),
])

const STRONG_TIE = question('strong_tie', [
  option('yes', { MANGE: 30, FUNGAL: -30 }),
  option('no', { MANGE: -30, FUNGAL: 30 }),
  option('unsure'),
])

const WEAK = question('weak', [
  option('yes', { MANGE: 2, FUNGAL: -2 }),
  option('no', { MANGE: -2, FUNGAL: 2 }),
  option('unsure'),
])

const IRRELEVANT = question('irrelevant', [
  option('yes'),
  option('no'),
  option('unsure'),
])

const MULTI = question(
  'location',
  [
    option('ears', { MANGE: 15, FUNGAL: 10 }),
    option('paws', { FUNGAL: 10, ALLERGIC_DERMATITIS: 8 }),
  ],
  true,
)

const ALL_KNOWLEDGE = makeKnowledge([STRONG, STRONG_TIE, WEAK, IRRELEVANT, MULTI])
const PROFILE = buildVetVoteLikelihoodProfile(ALL_KNOWLEDGE)
const PRIOR = distribution({ MANGE: 0.5, FUNGAL: 0.5 })

function config(overrides: Partial<AdaptiveConfig> = {}): AdaptiveConfig {
  return { ...TEST_CONFIG, ...overrides }
}

describe('strategy resolution', () => {
  it('uses information gain for adaptive mode with any profile', () => {
    assert.equal(resolveStrategy(config({ mode: 'adaptive' }), PROFILE), 'information_gain')
  })

  it('uses the fixed order for auto mode with an unvalidated profile', () => {
    assert.equal(resolveStrategy(config({ mode: 'auto' }), PROFILE), 'fixed_order')
  })

  it('uses information gain for auto mode with a validated profile', () => {
    assert.equal(
      resolveStrategy(
        config({ mode: 'auto' }),
        { ...PROFILE, validation: 'validated' },
      ),
      'information_gain',
    )
  })

  it('uses the fixed order for rule_based mode and for a missing profile', () => {
    assert.equal(resolveStrategy(config({ mode: 'rule_based' }), PROFILE), 'fixed_order')
    assert.equal(resolveStrategy(config({ mode: 'adaptive' }), null), 'fixed_order')
  })
})

describe('applicability', () => {
  it('defaults to applicable and respects a supplied rule', () => {
    assert.equal(isQuestionApplicable('x', {}, undefined), true)
    const rules: ApplicabilityRules = { x: (answers) => answers.trigger?.[0] === 'yes' }
    assert.equal(isQuestionApplicable('x', {}, rules), false)
    assert.equal(isQuestionApplicable('x', { trigger: ['yes'] }, rules), true)
  })

  it('fails closed when an applicability rule throws', () => {
    const rules: ApplicabilityRules = {
      x: () => {
        throw new Error('bad rule')
      },
    }
    assert.equal(isQuestionApplicable('x', {}, rules), false)
  })
})

describe('information-gain selection', () => {
  it('selects the question with the highest expected information gain', () => {
    const result = selectNextQuestion({
      knowledge: ALL_KNOWLEDGE,
      answers: {},
      prior: PRIOR,
      profile: PROFILE,
      config: config(),
      questionCount: 0,
    })
    assert.equal(result.question?.id, 'strong')
    assert.ok(result.expectedInformationGain > 0)
  })

  it('breaks exact information-gain ties by original question order', () => {
    const knowledge = makeKnowledge([IRRELEVANT, STRONG_TIE, STRONG])
    const profile = buildVetVoteLikelihoodProfile(knowledge)
    const result = selectNextQuestion({
      knowledge,
      answers: {},
      prior: PRIOR,
      profile,
      config: config(),
      questionCount: 0,
    })
    assert.equal(result.question?.id, 'strong_tie')
  })

  it('excludes already answered questions', () => {
    const result = selectNextQuestion({
      knowledge: ALL_KNOWLEDGE,
      answers: { strong: ['yes'] },
      prior: PRIOR,
      profile: PROFILE,
      config: config(),
      questionCount: 1,
    })
    assert.notEqual(result.question?.id, 'strong')
  })

  it('excludes inapplicable questions', () => {
    const knowledge = makeKnowledge([STRONG, WEAK])
    const profile = buildVetVoteLikelihoodProfile(knowledge)
    const rules: ApplicabilityRules = { weak: (answers) => answers.strong?.[0] === 'yes' }
    const result = selectNextQuestion({
      knowledge,
      answers: {},
      prior: PRIOR,
      profile,
      config: config(),
      questionCount: 0,
      applicability: rules,
    })
    assert.equal(result.question?.id, 'strong')
  })

  it('stops when no question has meaningful expected gain', () => {
    const knowledge = makeKnowledge([IRRELEVANT])
    const profile = buildVetVoteLikelihoodProfile(knowledge)
    const result = selectNextQuestion({
      knowledge,
      answers: {},
      prior: PRIOR,
      profile,
      config: config({ minExpectedInformationGain: 0.001 }),
      questionCount: 0,
    })
    assert.equal(result.question, null)
    assert.equal(result.stopReason, 'no_meaningful_question')
  })

  it('stops at the maximum question count', () => {
    const result = selectNextQuestion({
      knowledge: ALL_KNOWLEDGE,
      answers: {},
      prior: PRIOR,
      profile: PROFILE,
      config: config({ maxQuestions: 2 }),
      questionCount: 2,
    })
    assert.equal(result.question, null)
    assert.equal(result.stopReason, 'max_questions')
  })

  it('stops when the question set is empty', () => {
    const result = selectNextQuestion({
      knowledge: makeKnowledge([]),
      answers: {},
      prior: PRIOR,
      profile: buildVetVoteLikelihoodProfile(makeKnowledge([])),
      config: config(),
      questionCount: 0,
    })
    assert.equal(result.question, null)
    assert.equal(result.stopReason, 'all_questions_answered')
  })

  it('stops when every remaining question lacks likelihoods', () => {
    const knowledge = makeKnowledge([STRONG])
    const result = selectNextQuestion({
      knowledge,
      answers: {},
      prior: PRIOR,
      profile: buildVetVoteLikelihoodProfile(makeKnowledge([])),
      config: config(),
      questionCount: 0,
    })
    assert.equal(result.question, null)
    assert.equal(result.stopReason, 'all_questions_answered')
  })

  it('uses fixed order in rule_based mode', () => {
    const knowledge = makeKnowledge([WEAK, STRONG])
    const profile = buildVetVoteLikelihoodProfile(knowledge)
    const result = selectNextQuestion({
      knowledge,
      answers: {},
      prior: PRIOR,
      profile,
      config: config({ mode: 'rule_based' }),
      questionCount: 0,
    })
    assert.equal(result.question?.id, 'weak')
  })

  it('computes a positive gain for a multi-select question', () => {
    const gain = questionInformationGain(
      MULTI,
      PRIOR,
      {},
      ALL_KNOWLEDGE,
      PROFILE,
      config(),
    )
    assert.ok(gain > 0)
  })
})

describe('correlation and image-coupling weights', () => {
  const knowledge = makeKnowledge([
    question('distribution_a', [option('yes', { MANGE: 10 }), option('no')]),
    question('distribution_b', [option('yes', { MANGE: 10 }), option('no')]),
    question('circular', [option('yes', { FUNGAL: 10 }), option('no')]),
  ])

  it('decays the second answer in the same evidence group', () => {
    const weight = redundancyWeightForQuestion(
      'distribution_b',
      { distribution_a: ['yes'] },
      knowledge,
      config(),
    )
    assert.ok(weight < 1)
    assert.ok(weight >= TEST_CONFIG.minRedundancyWeight)
  })

  it('gives the first answer in a group the full weight', () => {
    assert.equal(
      redundancyWeightForQuestion('distribution_a', {}, knowledge, config()),
      1,
    )
  })

  it('tempers visual questions but not history-only questions', () => {
    const visual = combinedEvidenceWeight('circular', {}, knowledge, config({ visualEvidenceWeight: 0.8 }))
    assert.equal(visual.visual, 0.8)
    assert.equal(visual.combined, 0.8)

    const history = combinedEvidenceWeight('onset', {}, knowledge, config({ visualEvidenceWeight: 0.8 }))
    assert.equal(history.visual, 1)
    assert.equal(history.combined, 1)
  })
})
