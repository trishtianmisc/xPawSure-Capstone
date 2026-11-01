import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { SCREENING_CLASS_ORDER } from '../classes.ts'

describe('EfficientNetB0 class order', () => {
  it('preserves the trained output order', () => {
    assert.deepEqual(SCREENING_CLASS_ORDER, [
      'ALLERGIC_DERMATITIS',
      'BACTERIAL',
      'FUNGAL',
      'HOTSPOT',
      'MANGE',
    ])
  })

  it('contains five unique classes', () => {
    assert.equal(SCREENING_CLASS_ORDER.length, 5)
    assert.equal(new Set(SCREENING_CLASS_ORDER).size, 5)
  })
})
