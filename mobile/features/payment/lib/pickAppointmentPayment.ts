import type { Payment } from '../types'

/**
 * The payment that represents an appointment's consultation fee.
 *
 * One appointment can own several payment records (a failed or expired
 * checkout followed by a retry), so a settled PAID record always wins; an
 * in-flight PENDING checkout is next, and anything else is shown as-is.
 */
export function pickAppointmentPayment(
  payments: readonly Payment[],
): Payment | null {
  const paid = payments.find((payment) => payment.status === 'PAID')
  if (paid) return paid

  const pending = payments.find((payment) => payment.status === 'PENDING')
  if (pending) return pending

  return payments[0] ?? null
}
