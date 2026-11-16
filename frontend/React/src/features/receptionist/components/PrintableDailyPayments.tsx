import { formatDateTime } from '../../../utils/format'
import { formatPeso } from '../../../utils/currency'
import type { paymentService } from '../../payments/services/payment.service'

type PaymentListResponse = Awaited<ReturnType<typeof paymentService.list>>

interface Props {
  data: PaymentListResponse
  timeZone: string
  clinicName: string
  // Human-readable labels (resolved by the page), e.g. "Paid", "All".
  filters: { search: string; status: string; method: string }
}

export function PrintableDailyPayments({ data, timeZone, clinicName, filters }: Props) {
  // paid_from is the clinic-local calendar day; parse as local, never UTC.
  const day = data.paid_from
    ? new Date(`${data.paid_from}T00:00:00`).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  const generated = formatDateTime(new Date().toISOString(), timeZone)

  const filterLine = [
    `Status: ${filters.status}`,
    `Method: ${filters.method}`,
    filters.search ? `Search: ${filters.search}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="hidden bg-white p-6 text-black print:block">
      <h1 className="text-lg font-bold">{clinicName} — Daily Payments</h1>
      <p className="text-sm">
        {day ? `${day} · ` : ''}Generated {generated}
      </p>
      <p className="text-sm">{filterLine}</p>

      <p className="mt-3 text-sm">
        Collected today: <strong>{formatPeso(data.summary.paid_total)}</strong> ·
        Payments: <strong>{data.summary.payment_count}</strong> ·
        Refunded today: <strong>{formatPeso(data.summary.refunded_total)}</strong>
      </p>

      <table className="mt-3 w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-black text-left">
            <th className="py-1 pr-2">Receipt</th>
            <th className="pr-2">Patient</th>
            <th className="pr-2">Owner</th>
            <th className="pr-2">Method</th>
            <th className="pr-2">Amount</th>
            <th className="pr-2">Status</th>
            <th>Paid</th>
          </tr>
        </thead>
        <tbody>
          {data.results.map((p) => (
            <tr key={p.pay_id} className="break-inside-avoid border-b border-gray-300">
              <td className="py-1 pr-2 font-mono">{p.reference_no}</td>
              <td className="pr-2">{p.pet_name ?? '—'}</td>
              <td className="pr-2">{p.owner_name ?? '—'}</td>
              <td className="pr-2">{p.method}</td>
              <td className="pr-2">{formatPeso(p.amount)}</td>
              <td className="pr-2">
                {p.status}
                {p.refund_reference ? ` · ${p.refund_reference}` : ''}
              </td>
              <td>
                {p.paid_at ? formatDateTime(p.paid_at, timeZone) : '—'}
                {p.refunded_at
                  ? ` · Refunded ${formatDateTime(p.refunded_at, timeZone)}`
                  : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-2 text-xs">
        {data.total > data.results.length
          ? `Showing ${data.results.length} of ${data.total} payments.`
          : `Showing all ${data.total} payments.`}
      </p>
    </div>
  )
}
