import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { KNOWLEDGE } from '../../decisionTree/knowledge.ts'
import { DISEASES } from '../types.ts'
import {
  allMultiSelectLikelihoods,
  allSingleChoiceLikelihoods,
  buildVetVoteLikelihoodProfile,
  informativeSingleChoiceLikelihoods,
  observedMultiSelectLikelihoods,
  observedSingleChoiceLikelihoods,
  validateLikelihoodProfile,
} from '../likelihoods.ts'
import {
  distribution,
  makeKnowledge,
  option,
  question,
} from './helpers.ts'

const SINGLE_KNOWLEDGE = makeKnowledge([
  question('shape', [
    option('yes', { MANGE: 30, FUNGAL: -20 }),
    option('no', { MANGE: -20, FUNGAL: 10, HOTSPOT: 5 }),
    option('unsure'),
  ]),
])

const MULTI_KNOWLEDGE = makeKnowledge([
  question(
    'location',
    [
      option('ears', { MANGE: 10, FUNGAL: 10 }),
      option('paws', { FUNGAL: 8, ALLERGIC_DERMATITIS: 8 }),
      option('back', { HOTSPOT: 8 }),
    ],
    true,
  ),
])

function close(actual: number, expected: number, tolerance = 1e-6): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  )
}

function subsetSums(questionValue: ReturnType<typeof question>, profile: ReturnType<typeof buildVetVoteLikelihoodProfile>): number[] {
  const sums = DISEASES.map(() => 0)
  const count = 1 << questionValue.options.length

  for (let mask = 0; mask < count; mask += 1) {
    const selected: string[] = []
    for (let i = 0; i < questionValue.options.length; i += 1) {
      if ((mask & (1 << i)) !== 0) selected.push(questionValue.options[i].id)
    }
    const likelihoods = observedMultiSelectLikelihoods(questionValue, selected, profile, 1)
    DISEASES.forEach((disease, index) => {
      sums[index] += likelihoods[disease]
    })
  }

  return sums
}

describe('likelihood profile construction', () => {
  it('builds structurally valid single-choice likelihoods', () => {
    const profile = buildVetVoteLikelihoodProfile(SINGLE_KNOWLEDGE)
    assert.deepEqual(validateLikelihoodProfile(profile, SINGLE_KNOWLEDGE), [])

    const questionValue = SINGLE_KNOWLEDGE.questions[0]
    const informative = questionValue.options.filter((optionValue) => optionValue.id !== 'unsure')

    for (const disease of DISEASES) {
      const total = informative.reduce(
        (sum, optionValue) => sum + profile.questions.shape.options[optionValue.id][disease],
        0,
      )
      close(total, 1)
    }

    const neutral = profile.questions.shape.options.unsure
    for (const disease of DISEASES) close(neutral[disease], 1)
    assert.deepEqual(profile.questions.shape.neutralOptions, ['unsure'])
  })

  it('builds multi-select probabilities strictly inside the open unit interval', () => {
    const profile = buildVetVoteLikelihoodProfile(MULTI_KNOWLEDGE)
    assert.deepEqual(validateLikelihoodProfile(profile, MULTI_KNOWLEDGE), [])

    for (const optionValue of MULTI_KNOWLEDGE.questions[0].options) {
      for (const disease of DISEASES) {
        const p = profile.questions.location.options[optionValue.id][disease]
        assert.ok(p > 0 && p < 1, `${optionValue.id}/${disease} is ${p}`)
      }
    }
  })

  it('defines a proper positive-only distribution over every multi-select subset', () => {
    const profile = buildVetVoteLikelihoodProfile(MULTI_KNOWLEDGE)
    const sums = subsetSums(MULTI_KNOWLEDGE.questions[0], profile)
    for (const total of sums) close(total, 1)
  })

  it('excludes the empty subset from the selectable answer space', () => {
    const profile = buildVetVoteLikelihoodProfile(MULTI_KNOWLEDGE)
    const likelihoods = allMultiSelectLikelihoods(
      MULTI_KNOWLEDGE.questions[0],
      profile,
      1,
    )
    assert.ok(likelihoods)
    assert.equal(likelihoods.length, 7)
  })

  it('returns outcome likelihoods that differ between conditions', () => {
    const profile = buildVetVoteLikelihoodProfile(SINGLE_KNOWLEDGE)
    const yes = observedSingleChoiceLikelihoods(
      SINGLE_KNOWLEDGE.questions[0],
      'yes',
      profile,
      1,
    )
    assert.ok(yes.MANGE > yes.FUNGAL)
    assert.ok(yes.MANGE > yes.HOTSPOT)
  })

  it('treats "Not sure" as no evidence rather than a negative answer', () => {
    const profile = buildVetVoteLikelihoodProfile(SINGLE_KNOWLEDGE)
    const unsure = observedSingleChoiceLikelihoods(
      SINGLE_KNOWLEDGE.questions[0],
      'unsure',
      profile,
      1,
    )
    for (const disease of DISEASES) close(unsure[disease], 1)

    const informative = informativeSingleChoiceLikelihoods(
      SINGLE_KNOWLEDGE.questions[0],
      profile,
      1,
    )
    assert.equal(informative.length, 2)
    for (const likelihoods of informative) {
      const values = DISEASES.map((disease) => likelihoods[disease])
      assert.ok(Math.max(...values) - Math.min(...values) > 0)
    }
  })

  it('reports missing questions, missing options and bad sums', () => {
    const profile = buildVetVoteLikelihoodProfile(SINGLE_KNOWLEDGE)
    const brokenKnowledge = makeKnowledge([
      question('new_question', [option('yes'), option('no')]),
    ])
    const errors = validateLikelihoodProfile(profile, brokenKnowledge)
    assert.ok(errors.some((error) => error.includes('Missing likelihoods for question')))

    const brokenProfile = {
      ...profile,
      questions: {
        shape: {
          ...profile.questions.shape,
          options: {
            ...profile.questions.shape.options,
            yes: distribution({ MANGE: 0.9, FUNGAL: 0.9 }),
          },
        },
      },
    }
    const sumErrors = validateLikelihoodProfile(brokenProfile, SINGLE_KNOWLEDGE)
    assert.ok(sumErrors.some((error) => error.includes('sum to')))
  })

  it('covers the real vet knowledge profile without structural errors', () => {
    const profile = buildVetVoteLikelihoodProfile(KNOWLEDGE)
    assert.deepEqual(validateLikelihoodProfile(profile, KNOWLEDGE), [])
    assert.equal(Object.keys(profile.questions).length, KNOWLEDGE.questions.length)
    assert.equal(profile.validation, 'unvalidated_expert_heuristic')
  })

  it('handles an empty question set', () => {
    const profile = buildVetVoteLikelihoodProfile(makeKnowledge([]))
    assert.deepEqual(profile.questions, {})
    assert.deepEqual(validateLikelihoodProfile(profile, makeKnowledge([])), [])
  })

  it('exposes all single-choice answer likelihoods', () => {
    const profile = buildVetVoteLikelihoodProfile(SINGLE_KNOWLEDGE)
    const all = allSingleChoiceLikelihoods(SINGLE_KNOWLEDGE.questions[0], profile, 1)
    assert.equal(all.length, SINGLE_KNOWLEDGE.questions[0].options.length)
  })
})
