import { useParams, useSearchParams } from 'react-router-dom'

import { Alert, Button, Card } from '../../../components/ui'
import { formatDateTime } from '../../../utils/format'
import { PaymentStatusBadge } from '../components/PaymentStatusBadge'
import { useConfirmMockPayment, useMockPayment } from '../hooks/usePayments'
import type { Payment } from '../types/payment.types'

function formatAmount(amount: number, currency: string): string {
  return `${currency === 'PHP' ? '₱' : `${currency} `}${amount.toFixed(2)}`
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-stone-100 py-3 last:border-0 dark:border-stone-700">
      <dt className="text-sm text-stone-500 dark:text-stone-400">{label}</dt>
      <dd className="text-sm font-semibold text-stone-800 dark:text-stone-100">{value}</dd>
    </div>
  )
}

function PendingActions({
  payment,
  onConfirm,
  busy,
}: {
  payment: Payment
  onConfirm: (outcome: 'success' | 'decline') => void
  busy: boolean
}) {
  return (
    <div className="mt-6 space-y-3">
      <Button
        className="w-full"
        size="lg"
        loading={busy}
        onClick={() => onConfirm('success')}
      >
        Pay {formatAmount(payment.amount, payment.currency)}
      </Button>
      <Button
        variant="secondary"
        className="w-full"
        disabled={busy}
        onClick={() => onConfirm('decline')}
      >
        Simulate a declined payment
      </Button>
      <p className="text-center text-xs text-stone-500 dark:text-stone-400">
        Mock gateway — no real money moves. The booking page updates as soon as
        this settles.
      </p>
    </div>
  )
}

/**
 * The checkout page opened from `PAYMENT.checkout_url`. It carries a signed
 * token instead of a session, so an owner can pay from any browser.
 */
export function MockCheckoutPage() {
  const { reference = '' } = useParams<{ reference: string }>()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const {
    data: payment,
    isLoading,
    isError,
    error,
  } = useMockPayment(reference, token)
  const confirm = useConfirmMockPayment(reference, token)

  const busy = confirm.isPending

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-10 dark:bg-stone-900">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-lg font-bold text-amber-900 dark:text-amber-400">XPawSure</p>
          <p className="text-sm text-stone-500 dark:text-stone-400">Consultation fee</p>
        </div>

        <Card>
          {isLoading && (
            <p className="py-8 text-center text-sm text-stone-500 dark:text-stone-400">
              Loading checkout…
            </p>
          )}

          {isError && !payment && (
            <Alert variant="error">
              {(error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
                'This checkout link is invalid or has expired.'}
            </Alert>
          )}

          {payment && (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-3xl font-bold text-stone-900 dark:text-white">
                    {formatAmount(payment.amount, payment.currency)}
                  </p>
                  <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                    Consultation fee · {payment.method}
                  </p>
                </div>
                <PaymentStatusBadge status={payment.status} />
              </div>

              <dl className="mt-6">
                <DetailRow label="Reference" value={payment.reference_no} />
                <DetailRow label="Patient" value={payment.pet_name ?? '—'} />
                <DetailRow label="Owner" value={payment.owner_name ?? '—'} />
                {payment.paid_at && (
                  <DetailRow label="Paid at" value={formatDateTime(payment.paid_at)} />
                )}
              </dl>

              {payment.status === 'PENDING' && (
                <PendingActions
                  payment={payment}
                  busy={busy}
                  onConfirm={(outcome) => confirm.mutate(outcome)}
                />
              )}

              {payment.status === 'PAID' && (
                <Alert variant="success" className="mt-6">
                  Payment received. You can close this tab — the appointment is
                  being booked.
                </Alert>
              )}

              {(payment.status === 'FAILED' || payment.status === 'EXPIRED') && (
                <Alert variant="error" className="mt-6">
                  {payment.failure_reason ?? 'This payment could not be completed.'} Ask the
                  clinic to issue a new checkout link.
                </Alert>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
