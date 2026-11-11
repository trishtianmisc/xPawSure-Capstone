import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { normalizeCapturedImageUri } from '../lib/prescriptionImage.ts'

describe('prescriptionImage', () => {
  it('preserves filesystem and native URI schemes', () => {
    assert.equal(
      normalizeCapturedImageUri('file:///tmp/prescription.png'),
      'file:///tmp/prescription.png',
    )
    assert.equal(
      normalizeCapturedImageUri('content://media/external/images/1'),
      'content://media/external/images/1',
    )
    assert.equal(
      normalizeCapturedImageUri('data:image/png;base64,abc'),
      'data:image/png;base64,abc',
    )
  })

  it('adds a file scheme to absolute paths returned without one', () => {
    assert.equal(
      normalizeCapturedImageUri('/data/user/0/cache/prescription.png'),
      'file:///data/user/0/cache/prescription.png',
    )
  })

  it('leaves empty values unchanged', () => {
    assert.equal(normalizeCapturedImageUri(''), '')
    assert.equal(normalizeCapturedImageUri('   '), '')
  })
})
