import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { isClaudeValidationApproved } from '../comparison.ts'
import type {
  ClaudeAnalysisResponse,
  ClaudeImageSuitability,
  ScreeningEligibility,
} from '../types/index.ts'

function claudeWith(
  overrides: {
    status?: ClaudeAnalysisResponse['status']
    suitability?: ClaudeImageSuitability
    eligibility?: ScreeningEligibility
  } = {},
): ClaudeAnalysisResponse {
  const {
    status = 'OK',
    suitability = 'SUITABLE',
    eligibility = 'ELIGIBLE',
  } = overrides

  return {
    status,
    model: 'test-model',
    analyzed_at: '2026-10-22T10:00:00Z',
    latency_ms: 120,
    usage: { input_tokens: 100, output_tokens: 50 },
    detail: '',
    token: 'signed-token',
    result: status === 'OK'
      ? {
          image_suitability: suitability,
          screening_eligibility: eligibility,
          screening_message: 'The photo is clear enough for screening.',
          visible_features: ['redness'],
          image_quality: { adequate: true, observations: ['clear enough to review'] },
          condition_assessment: {
            closest_match: 'BACTERIAL',
            other_possibilities: [],
            unclear: false,
            rationale: 'Visible redness is non-specific.',
          },
          vet_recommendation: 'Have a veterinarian examine the affected skin.',
        }
      : null,
  }
}

describe('isClaudeValidationApproved', () => {
  it('approves only an OK result that is suitable and eligible', () => {
    assert.equal(isClaudeValidationApproved(claudeWith()), true)
    assert.equal(
      isClaudeValidationApproved(claudeWith({
        suitability: 'WOUND_OR_INJURY',
        eligibility: 'NOT_ELIGIBLE',
      })),
      false,
    )
    assert.equal(
      isClaudeValidationApproved(claudeWith({
        suitability: 'NOT_DOG_SKIN',
        eligibility: 'NOT_ELIGIBLE',
      })),
      false,
    )
    assert.equal(
      isClaudeValidationApproved(claudeWith({
        suitability: 'NO_VISIBLE_LESIONS',
        eligibility: 'NOT_ELIGIBLE',
      })),
      false,
    )
    assert.equal(isClaudeValidationApproved(claudeWith({ status: 'TIMEOUT' })), false)
    assert.equal(isClaudeValidationApproved(null), false)
  })
})
