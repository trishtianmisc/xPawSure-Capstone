import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { getDiagnosisAgreement } from '../lib/screeningMatch.ts'

describe('getDiagnosisAgreement', () => {
  it('returns null without a screening disease or diagnosis', () => {
    assert.equal(getDiagnosisAgreement(undefined, 'Mange'), null)
    assert.equal(getDiagnosisAgreement({ disease: 'Mange' }, undefined), null)
    assert.equal(getDiagnosisAgreement({ disease: '   ' }, 'Mange'), null)
    assert.equal(getDiagnosisAgreement({ disease: 'Mange' }, '  '), null)
  })

  it('matches normalized names case-insensitively', () => {
    assert.equal(
      getDiagnosisAgreement({ disease: '  Sarcoptic   Mange ' }, 'sarcoptic mange'),
      true,
    )
  })

  it('matches when one diagnosis contains the other', () => {
    assert.equal(getDiagnosisAgreement({ disease: 'Mange' }, 'Sarcoptic mange'), true)
    assert.equal(getDiagnosisAgreement({ disease: 'Sarcoptic mange' }, 'Mange'), true)
  })

  it('returns false when the diagnoses differ', () => {
    assert.equal(getDiagnosisAgreement({ disease: 'Mange' }, 'Allergic dermatitis'), false)
  })
})
