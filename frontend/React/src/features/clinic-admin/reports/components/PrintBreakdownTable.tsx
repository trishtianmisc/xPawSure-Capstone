export interface BreakdownRow {
  label: string
  count: number
}

interface PrintBreakdownTableProps {
  title: string
  // Heading of the first column, e.g. "Status", "Condition", "Breed".
  labelHeading: string
  rows: BreakdownRow[]
  // Show only the largest N rows and fold the rest into one "Other" row.
  maxRows?: number
  emptyText?: string
}

function formatPercent(count: number, total: number): string {
  if (total <= 0) return '—'
  return `${((count / total) * 100).toFixed(1)}%`
}

// Paper-first breakdown table: label, count, share of the table's own total.
// Light-only colors on purpose (see PrintableReport).
export function PrintBreakdownTable({
  title,
  labelHeading,
  rows,
  maxRows,
  emptyText = 'No data for this period.',
}: PrintBreakdownTableProps) {
  const sorted = [...rows].sort((a, b) => b.count - a.count)
  const total = sorted.reduce((sum, row) => sum + row.count, 0)

  let shown = sorted
  if (maxRows && sorted.length > maxRows) {
    const rest = sorted.slice(maxRows)
    shown = [
      ...sorted.slice(0, maxRows),
      { label: 'Other', count: rest.reduce((sum, row) => sum + row.count, 0) },
    ]
  }

  return (
    <div>
      <h3 className="text-sm font-bold text-stone-900">{title}</h3>
      {shown.length === 0 ? (
        <p className="mt-1 text-xs text-stone-500">{emptyText}</p>
      ) : (
        <table className="mt-1 w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-stone-400 text-left">
              <th className="py-1 pr-2 font-semibold">{labelHeading}</th>
              <th className="py-1 pr-2 text-right font-semibold">Count</th>
              <th className="py-1 text-right font-semibold">% of total</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={row.label} className="break-inside-avoid border-b border-stone-200">
                <td className="py-1 pr-2">{row.label}</td>
                <td className="py-1 pr-2 text-right tabular-nums">{row.count}</td>
                <td className="py-1 text-right tabular-nums">
                  {formatPercent(row.count, total)}
                </td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="py-1 pr-2">Total</td>
              <td className="py-1 pr-2 text-right tabular-nums">{total}</td>
              <td className="py-1 text-right tabular-nums">
                {total > 0 ? '100%' : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  )
}
