import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { formatDiseaseName } from '../lib/diseaseNames.ts'

describe('formatDiseaseName', () => {
  it('shows the full name for bacterial and fungal results', () => {
    assert.equal(formatDiseaseName('Bacterial'), 'Bacterial Infection')
    assert.equal(formatDiseaseName('Fungal'), 'Fungal Infection')
  })

  it('matches known results case-insensitively and ignores surrounding whitespace', () => {
    assert.equal(formatDiseaseName('  bacterial '), 'Bacterial Infection')
    assert.equal(formatDiseaseName('FUNGAL'), 'Fungal Infection')
  })

  it('leaves other and already-expanded names unchanged', () => {
    assert.equal(formatDiseaseName('Mange'), 'Mange')
    assert.equal(formatDiseaseName('Fungal Infection'), 'Fungal Infection')
  })
})
