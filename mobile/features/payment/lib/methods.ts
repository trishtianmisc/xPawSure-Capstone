import type { OwnerPaymentMethod } from '../types'

/** Owners can never record cash, so it is never offered in the app. */
export const OWNER_METHODS: Array<{ value: OwnerPaymentMethod; label: string }> = [
  { value: 'GCASH', label: 'GCash' },
  { value: 'CARD', label: 'Card' },
]
