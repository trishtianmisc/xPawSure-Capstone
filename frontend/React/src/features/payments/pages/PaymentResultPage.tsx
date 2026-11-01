import { useParams } from 'react-router-dom'

import { Card } from '../../../components/ui'

export type PaymentResult = 'success' | 'cancelled'

const COPY: Record<PaymentResult, { title: string; message: string; note: string }> = {
  success: {
    title: 'Payment received',
    message: 'Your checkout is complete. Return to the XPawSure app to finish booking.',
    note: 'Confirmation reaches XPawSure through the gateway webhook, so the app may take a few seconds to show it as paid.',
  },
  cancelled: {
    title: 'Payment cancelled',
    message: 'No money was taken. You can return to XPawSure and start the booking again.',
    note: 'If you still need to pay, ask the clinic for a new checkout link once the previous one expires.',
  },
}

function ResultIcon({ result }: { result: PaymentResult }) {
  const success = result === 'success'

  return (
    <div
      className={
        success
          ? 'mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
          : 'mx-auto flex size-14 items-center justify-center rounded-full bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300'
      }
    >
      <svg
        aria-hidden="true"
        className="size-7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        viewBox="0 0 24 24"
      >
        {success ? <path d="M20 6 9 17l-5-5" /> : <path d="M18 6 6 18M6 6l12 12" />}
      </svg>
    </div>
  )
}

/**
 * Landing page PayMongo redirects to (``success_url`` / ``cancel_url``).
 *
 * It deliberately reads nothing from the API: the only thing in the URL is a
 * payment reference, and the authoritative status is the webhook. Showing
 * static guidance keeps the page safe to open without a session.
 */
export function PaymentResultPage({ result }: { result: PaymentResult }) {
  const { reference = '' } = useParams<{ reference: string }>()
  const copy = COPY[result]

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-10 dark:bg-stone-900">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-lg font-bold text-amber-900 dark:text-amber-400">XPawSure</p>
          <p className="text-sm text-stone-500 dark:text-stone-400">Consultation fee</p>
        </div>

        <Card>
          <div className="text-center">
            <ResultIcon result={result} />
            <h1 className="mt-4 text-xl font-bold text-stone-900 dark:text-white">
              {copy.title}
            </h1>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">{copy.message}</p>
          </div>

          {reference && (
            <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4 dark:border-stone-700">
              <span className="text-sm text-stone-500 dark:text-stone-400">Reference</span>
              <span className="font-mono text-sm font-semibold text-stone-800 dark:text-stone-100">
                {reference}
              </span>
            </div>
          )}

          <p className="mt-4 text-center text-xs text-stone-500 dark:text-stone-400">
            {copy.note}
          </p>
        </Card>
      </div>
    </div>
  )
}
