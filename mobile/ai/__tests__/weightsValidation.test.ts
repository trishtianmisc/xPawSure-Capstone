import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  EXPECTED_MODEL_WEIGHTS_BYTES,
  validateWeightsSize,
} from '../services/weightsValidation.ts'

describe('validateWeightsSize', () => {
  it('accepts the exact bundled weights size', () => {
    assert.doesNotThrow(() => validateWeightsSize(EXPECTED_MODEL_WEIGHTS_BYTES))
    assert.equal(EXPECTED_MODEL_WEIGHTS_BYTES, 17_670_816)
  })

  it('rejects a truncated weights file', () => {
    assert.throws(
      () => validateWeightsSize(EXPECTED_MODEL_WEIGHTS_BYTES - 1),
      /size mismatch/,
    )
  })

  it('rejects an oversized or foreign weights file', () => {
    assert.throws(() => validateWeightsSize(0), /size mismatch/)
    assert.throws(() => validateWeightsSize(EXPECTED_MODEL_WEIGHTS_BYTES + 1), /size mismatch/)
  })
})
