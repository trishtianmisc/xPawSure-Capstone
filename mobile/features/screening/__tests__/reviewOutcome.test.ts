import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { classifyReviewOutcome } from '../reviewOutcome.ts'
import type { ClaudeAnalysisStatus } from '../types/index.ts'

describe('classifyReviewOutcome', () => {
  it('runs the gate for OK with findings', () => {
    assert.equal(classifyReviewOutcome('OK', true), 'run-gate')
  })

  it('aborts when OK carries no findings', () => {
    assert.equal(classifyReviewOutcome('OK', false), 'abort')
  })

  it('previews when the review backend is not configured, with or without findings', () => {
    assert.equal(classifyReviewOutcome('NOT_CONFIGURED', false), 'preview-only')
    assert.equal(classifyReviewOutcome('NOT_CONFIGURED', true), 'preview-only')
  })

  const aborting: ClaudeAnalysisStatus[] = [
    'NOT_REQUESTED',
    'TIMEOUT',
    'RATE_LIMITED',
    'QUOTA_EXHAUSTED',
    'MALFORMED_RESPONSE',
    'PROVIDER_ERROR',
  ]

  it('aborts every other failure status regardless of findings', () => {
    for (const status of aborting) {
      assert.equal(classifyReviewOutcome(status, false), 'abort', `${status}/no-result`)
      assert.equal(classifyReviewOutcome(status, true), 'abort', `${status}/result`)
    }
  })

  it('covers every member of ClaudeAnalysisStatus exactly once in matrix terms', () => {
    const all: ClaudeAnalysisStatus[] = [
      'NOT_REQUESTED',
      'OK',
      'NOT_CONFIGURED',
      'TIMEOUT',
      'RATE_LIMITED',
      'QUOTA_EXHAUSTED',
      'MALFORMED_RESPONSE',
      'PROVIDER_ERROR',
    ]
    for (const status of all) {
      const outcome = classifyReviewOutcome(status, true)
      assert.ok(['run-gate', 'preview-only', 'abort'].includes(outcome), status)
    }
  })
})
