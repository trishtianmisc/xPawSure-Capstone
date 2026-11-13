import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { filterAppointmentsForMonth } from '../lib/schedule.ts'

const apt = (iso: string) => ({ apt_scheduled_at: iso, id: iso })

describe('filterAppointmentsForMonth', () => {
  const appointments = [
    apt('2026-03-10T09:00:00'),
    apt('2026-03-22T14:30:00'),
    apt('2026-04-01T09:00:00'),
    apt('2025-03-15T09:00:00'),
    apt('2026-02-28T09:00:00'),
  ]

  it('keeps only appointments in the requested month and year', () => {
    const result = filterAppointmentsForMonth(appointments, 2, 2026)
    assert.equal(result.length, 2)
    assert.deepEqual(
      result.map((a) => a.apt_scheduled_at),
      ['2026-03-10T09:00:00', '2026-03-22T14:30:00'],
    )
  })

  it('excludes the same month in a different year', () => {
    const result = filterAppointmentsForMonth(appointments, 2, 2025)
    assert.equal(result.length, 1)
    assert.equal(result[0].apt_scheduled_at, '2025-03-15T09:00:00')
  })

  it('sorts results chronologically', () => {
    const unsorted = [
      apt('2026-06-20T10:00:00'),
      apt('2026-06-01T08:00:00'),
      apt('2026-06-10T09:00:00'),
    ]
    const result = filterAppointmentsForMonth(unsorted, 5, 2026)
    assert.deepEqual(
      result.map((a) => a.apt_scheduled_at),
      ['2026-06-01T08:00:00', '2026-06-10T09:00:00', '2026-06-20T10:00:00'],
    )
  })

  it('returns an empty array when nothing matches', () => {
    assert.deepEqual(filterAppointmentsForMonth(appointments, 7, 2026), [])
  })

  it('does not mutate the input array', () => {
    const input = [apt('2026-06-20T10:00:00'), apt('2026-06-01T08:00:00')]
    const copy = [...input]
    filterAppointmentsForMonth(input, 5, 2026)
    assert.deepEqual(input, copy)
  })
})
