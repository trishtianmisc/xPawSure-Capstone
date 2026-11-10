import type { PaymentStatus } from '../types'

/** Shared receipt colours and labels for the detail screen and pay card. */
export const PAYMENT_PRESENTATION: Record<
  PaymentStatus,
  { label: string; bg: string; text: string }
> = {
  PENDING: { label: 'Pending', bg: '#FDEBD0', text: '#E67E22' },
  PAID: { label: 'Paid', bg: '#D5F5E3', text: '#1E8449' },
  FAILED: { label: 'Failed', bg: '#FADBD8', text: '#C0392B' },
  EXPIRED: { label: 'Expired', bg: '#E5E7E9', text: '#566573' },
  REFUNDED: { label: 'Refunded', bg: '#D6EAF8', text: '#2471A3' },
  VOID: { label: 'Void', bg: '#E5E7E9', text: '#566573' },
}
