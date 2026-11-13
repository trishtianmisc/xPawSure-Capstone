import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { vaccinationStatus } from '../lib/vaccinationStatus.ts'

describe('vaccinationStatus', () => {
  it('does not keep an old dose overdue after a newer dose is recorded', () => {
    assert.equal(vaccinationStatus('2000-01-01', false), null)
  })

  it('keeps the latest dose overdue until another dose is recorded', () => {
    assert.deepEqual(vaccinationStatus('2000-01-01', true), {
      label: 'Overdue',
      tone: 'overdue',
    })
  })

  it('has no due status when the latest dose has no due date', () => {
    assert.equal(vaccinationStatus(null, true), null)
  })
})
