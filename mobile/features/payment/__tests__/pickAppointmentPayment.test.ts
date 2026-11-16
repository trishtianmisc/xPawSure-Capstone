import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { pickAppointmentPayment } from '../lib/pickAppointmentPayment.ts'
import type { Payment } from '../types/index.ts'

function payment(overrides: Partial<Payment> = {}): Payment {
  return {
    pay_id: 'pay-1',
    reference_no: 'XPAY-000001',
    clinic_id: 'clinic-1',
    owner_id: 'owner-1',
    owner_name: 'Olive Owner',
    appointment_id: 'apt-1',
    pet_name: 'Rex',
    amount: 350,
    currency: 'PHP',
    method: 'GCASH',
    status: 'PENDING',
    provider: 'PAYMongo',
    checkout_url: null,
    expires_at: null,
    paid_at: null,
    failure_reason: null,
    refunded_at: null,
    refund_reason: null,
    refund_reference: null,
    created_at: '2026-11-01T08:00:00Z',
    updated_at: '2026-11-01T08:00:00Z',
    ...overrides,
  }
}

describe('pickAppointmentPayment', () => {
  it('prefers a settled PAID record over everything else', () => {
    const paid = payment({ pay_id: 'pay-3', status: 'PAID' })
    const picked = pickAppointmentPayment([
      payment({ pay_id: 'pay-1', status: 'FAILED' }),
      payment({ pay_id: 'pay-2', status: 'PENDING' }),
      paid,
    ])
    assert.equal(picked?.pay_id, 'pay-3')
  })

  it('prefers a refunded fee over a newer pending retry', () => {
    const refunded = payment({ pay_id: 'pay-1', status: 'REFUNDED' })
    const picked = pickAppointmentPayment([
      refunded,
      payment({ pay_id: 'pay-2', status: 'PENDING' }),
      payment({ pay_id: 'pay-3', status: 'EXPIRED' }),
    ])
    assert.equal(picked?.pay_id, 'pay-1')
  })

  it('falls back to the first PENDING checkout when nothing is paid or refunded', () => {
    const picked = pickAppointmentPayment([
      payment({ pay_id: 'pay-1', status: 'EXPIRED' }),
      payment({ pay_id: 'pay-2', status: 'PENDING' }),
      payment({ pay_id: 'pay-3', status: 'VOID' }),
    ])
    assert.equal(picked?.pay_id, 'pay-2')
  })

  it('returns the first record when none are paid, refunded, or pending', () => {
    const picked = pickAppointmentPayment([
      payment({ pay_id: 'pay-1', status: 'FAILED' }),
      payment({ pay_id: 'pay-2', status: 'VOID' }),
    ])
    assert.equal(picked?.pay_id, 'pay-1')
  })

  it('returns null for an empty list', () => {
    assert.equal(pickAppointmentPayment([]), null)
  })
})
