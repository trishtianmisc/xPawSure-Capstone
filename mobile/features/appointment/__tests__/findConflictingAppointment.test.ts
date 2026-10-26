import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  LIVE_APPOINTMENT_STATUSES,
  findConflictingAppointment,
} from '../lib/findConflictingAppointment.ts'
import type { AppointmentListItem } from '../types/index.ts'

function appointment(
  overrides: Partial<AppointmentListItem> = {},
): AppointmentListItem {
  return {
    apt_id: 'apt-1',
    pet_id: 'pet-1',
    pet_name: 'Rex',
    pet_species: null,
    cln_id: 'clinic-1',
    stf_id: null,
    vet_name: null,
    owner_name: 'Olive',
    apt_type: 'CONSULTATION',
    apt_status: 'PENDING',
    apt_scheduled_at: '2026-11-03T10:00:00Z',
    apt_reason: null,
    created_by_name: null,
    screening: null,
    apt_checked_in_at: null,
    apt_completed_at: null,
    apt_cancelled_at: null,
    apt_created_at: '2026-10-27T08:00:00Z',
    ...overrides,
  }
}

describe('findConflictingAppointment', () => {
  it('flags every live status as a conflict', () => {
    for (const apt_status of LIVE_APPOINTMENT_STATUSES) {
      const conflict = findConflictingAppointment(
        [appointment({ apt_status })],
        'pet-1',
        'clinic-1',
      )
      assert.equal(conflict?.apt_status, apt_status)
    }
  })

  it('never flags terminal statuses', () => {
    for (const apt_status of ['COMPLETED', 'CANCELLED', 'NO_SHOW'] as const) {
      assert.equal(
        findConflictingAppointment(
          [appointment({ apt_status })],
          'pet-1',
          'clinic-1',
        ),
        null,
      )
    }
  })

  it('ignores live appointments at another clinic', () => {
    assert.equal(
      findConflictingAppointment(
        [appointment({ cln_id: 'clinic-2' })],
        'pet-1',
        'clinic-1',
      ),
      null,
    )
  })

  it('ignores live appointments for another pet', () => {
    assert.equal(
      findConflictingAppointment(
        [appointment({ pet_id: 'pet-2' })],
        'pet-1',
        'clinic-1',
      ),
      null,
    )
  })

  it('returns null for an empty list or missing ids', () => {
    assert.equal(findConflictingAppointment([], 'pet-1', 'clinic-1'), null)
    assert.equal(findConflictingAppointment([appointment()], '', 'clinic-1'), null)
    assert.equal(findConflictingAppointment([appointment()], 'pet-1', ''), null)
  })

  it('returns the first live match when several exist', () => {
    const first = appointment({ apt_id: 'apt-1' })
    const conflict = findConflictingAppointment(
      [appointment({ apt_id: 'apt-0', apt_status: 'CANCELLED' }), first],
      'pet-1',
      'clinic-1',
    )
    assert.equal(conflict?.apt_id, 'apt-1')
  })
})
