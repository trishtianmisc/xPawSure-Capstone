import type { PaymentStatus } from '../types/payment.types'

const STYLES: Record<PaymentStatus, { label: string; className: string }> = {
  PENDING: {
    label: 'Awaiting payment',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
  PAID: {
    label: 'Paid',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  FAILED: {
    label: 'Failed',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  },
  EXPIRED: {
    label: 'Expired',
    className: 'bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300',
  },
  REFUNDED: {
    label: 'Refunded',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  },
  VOID: {
    label: 'Cancelled',
    className: 'bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-400',
  },
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const style = STYLES[status] ?? STYLES.PENDING
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${style.className}`}
    >
      {style.label}
    </span>
  )
}
