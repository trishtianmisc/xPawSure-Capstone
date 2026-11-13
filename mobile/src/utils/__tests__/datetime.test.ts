import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  formatDate,
  formatDateTime,
  formatTime,
  manilaDateKey,
  manilaDateParts,
} from '../datetime.ts'

describe('Manila date formatting', () => {
  it('renders API timestamps in Asia/Manila', () => {
    assert.equal(formatDateTime('2026-10-08T10:40:00Z'), 'Oct 8, 2026, 6:40 PM')
    assert.equal(formatDate('2026-10-08T10:40:00Z'), 'Oct 8, 2026')
    assert.equal(formatTime('2026-10-08T10:40:00Z'), '6:40 PM')
  })

  it('rolls the calendar day over at Manila midnight', () => {
    assert.equal(formatDate('2026-10-01T16:30:00Z'), 'Oct 2, 2026')
    assert.equal(manilaDateKey('2026-10-01T16:30:00Z'), '2026-10-02')
    assert.equal(manilaDateKey('2026-10-01T15:59:00Z'), '2026-10-01')
  })

  it('exposes Manila calendar and clock parts', () => {
    assert.deepEqual(manilaDateParts(new Date('2026-10-01T16:30:00Z')), {
      year: 2026,
      month: 10,
      day: 2,
      hour: 0,
      minute: 30,
    })
  })

  it('returns an em dash for empty or invalid input', () => {
    assert.equal(formatDate(null), '—')
    assert.equal(formatDateTime('not-a-date'), '—')
    assert.equal(manilaDateKey(null), '')
  })
})
