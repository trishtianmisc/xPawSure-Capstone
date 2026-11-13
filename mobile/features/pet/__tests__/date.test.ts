import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  formatBirthDateDisplay,
  isFutureIsoDate,
  isoToDate,
  isValidIsoDate,
  toIsoDate,
} from '../lib/date.ts'

describe('isValidIsoDate', () => {
  it('accepts real calendar dates', () => {
    assert.equal(isValidIsoDate('2023-02-01'), true)
    assert.equal(isValidIsoDate('2024-02-29'), true) // leap year
    assert.equal(isValidIsoDate('2000-12-31'), true)
  })

  it('rejects malformed input', () => {
    assert.equal(isValidIsoDate(''), false)
    assert.equal(isValidIsoDate('abc'), false)
    assert.equal(isValidIsoDate('2023-2-1'), false)
    assert.equal(isValidIsoDate('01-02-2023'), false)
    assert.equal(isValidIsoDate('2023/02/01'), false)
  })

  it('rejects impossible calendar dates', () => {
    assert.equal(isValidIsoDate('2023-02-30'), false)
    assert.equal(isValidIsoDate('2023-13-01'), false)
    assert.equal(isValidIsoDate('2023-00-10'), false)
    assert.equal(isValidIsoDate('2023-04-31'), false)
    assert.equal(isValidIsoDate('2023-02-29'), false) // not a leap year
  })
})

describe('isFutureIsoDate', () => {
  it('treats today as not future', () => {
    const today = toIsoDate(new Date())
    assert.equal(isFutureIsoDate(today), false)
  })

  it('flags tomorrow as future', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    assert.equal(isFutureIsoDate(toIsoDate(tomorrow)), true)
  })

  it('does not flag past dates', () => {
    assert.equal(isFutureIsoDate('2020-06-15'), false)
  })

  it('returns false for invalid input', () => {
    assert.equal(isFutureIsoDate('not-a-date'), false)
  })
})

describe('toIsoDate / isoToDate', () => {
  it('round-trips through local components', () => {
    assert.equal(toIsoDate(new Date(2023, 1, 1)), '2023-02-01')
    assert.equal(toIsoDate(new Date(2023, 11, 31)), '2023-12-31')
  })

  it('pads single-digit months and days', () => {
    assert.equal(toIsoDate(new Date(2023, 0, 5)), '2023-01-05')
  })

  it('isoToDate parses without timezone drift', () => {
    const date = isoToDate('2023-02-01')
    assert.equal(date.getFullYear(), 2023)
    assert.equal(date.getMonth(), 1)
    assert.equal(date.getDate(), 1)
  })

  it('isoToDate falls back to today for invalid input', () => {
    const date = isoToDate('garbage')
    assert.equal(date.toDateString(), new Date().toDateString())
  })
})

describe('formatBirthDateDisplay', () => {
  it('formats valid dates deterministically', () => {
    assert.equal(formatBirthDateDisplay('2023-02-01'), 'Feb 1, 2023')
    assert.equal(formatBirthDateDisplay('2000-12-31'), 'Dec 31, 2000')
  })

  it('returns empty string for invalid input', () => {
    assert.equal(formatBirthDateDisplay(''), '')
    assert.equal(formatBirthDateDisplay('nope'), '')
  })
})
