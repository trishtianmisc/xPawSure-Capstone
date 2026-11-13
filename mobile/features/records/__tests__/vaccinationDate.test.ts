import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { toIsoDate } from '../../pet/lib/date.ts'
import { isWithinDateBounds, vaccinationPickerDate } from '../lib/vaccinationDate.ts'
import { localToday, toVaccinationPayload, vaccinationSchema } from '../schemas/vaccination.ts'

describe('vaccination calendar dates', () => {
  it('preserves calendar selections without UTC date shifts', () => {
    assert.equal(toIsoDate(vaccinationPickerDate('2024-02-29')), '2024-02-29')
    assert.equal(toIsoDate(vaccinationPickerDate('2026-01-01')), '2026-01-01')
  })

  it('opens at the minimum when an old next-due value precedes date given', () => {
    assert.equal(
      toIsoDate(vaccinationPickerDate('2025-01-01', '2026-01-01')),
      '2026-01-01',
    )
  })

  it('opens at the maximum when an existing value is too late', () => {
    assert.equal(
      toIsoDate(vaccinationPickerDate('2027-01-01', undefined, '2026-01-01')),
      '2026-01-01',
    )
  })

  it('defaults empty and invalid values to today within bounds', () => {
    assert.equal(toIsoDate(vaccinationPickerDate('')), localToday())
    assert.equal(toIsoDate(vaccinationPickerDate('invalid')), localToday())
    assert.equal(toIsoDate(vaccinationPickerDate('', undefined, '2000-01-01')), '2000-01-01')
  })

  it('allows boundary days and rejects invalid or out-of-range dates', () => {
    assert.equal(isWithinDateBounds('2026-01-01', '2026-01-01', '2026-01-31'), true)
    assert.equal(isWithinDateBounds('2026-01-31', '2026-01-01', '2026-01-31'), true)
    assert.equal(isWithinDateBounds('2025-12-31', '2026-01-01'), false)
    assert.equal(isWithinDateBounds('2026-02-01', undefined, '2026-01-31'), false)
    assert.equal(isWithinDateBounds('2026-02-30'), false)
  })
})

describe('vaccination date validation and payload', () => {
  const base = { pet_id: 'test-pet', name: 'Rabies', date_given: '2024-02-29' }

  it('keeps the API date-only contract for calendar selections', () => {
    const values = vaccinationSchema.parse({ ...base, next_due: '2025-02-28' })
    const payload = toVaccinationPayload(values)
    assert.equal(payload.date_given, '2024-02-29')
    assert.equal(payload.next_due, '2025-02-28')
  })

  it('allows a cleared or omitted next-due date and sends null', () => {
    for (const nextDue of ['', undefined]) {
      const values = vaccinationSchema.parse({ ...base, next_due: nextDue })
      assert.equal(toVaccinationPayload(values).next_due, null)
    }
  })

  it('allows historical next-due dates but not dates before administration', () => {
    assert.equal(vaccinationSchema.safeParse({ ...base, next_due: '2024-03-01' }).success, true)
    assert.equal(vaccinationSchema.safeParse({ ...base, next_due: '2024-02-28' }).success, false)
  })

  it('allows today and rejects future or impossible administration dates', () => {
    assert.equal(vaccinationSchema.safeParse({ ...base, date_given: localToday() }).success, true)
    assert.equal(vaccinationSchema.safeParse({ ...base, date_given: '9999-01-01' }).success, false)
    assert.equal(vaccinationSchema.safeParse({ ...base, date_given: '2024-02-30' }).success, false)
    assert.equal(vaccinationSchema.safeParse({ ...base, next_due: '2025-02-29' }).success, false)
  })
})
