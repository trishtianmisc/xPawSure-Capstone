export interface PrintStat {
  label: string
  value: string
}

// A one-line strip of labelled figures, used under a chart or table.
export function PrintStatRow({ stats }: { stats: PrintStat[] }) {
  return (
    <dl className="mt-2 flex flex-wrap gap-x-8 gap-y-1 border-t border-stone-200 pt-2 text-xs">
      {stats.map((stat) => (
        <div key={stat.label}>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            {stat.label}
          </dt>
          <dd className="font-semibold tabular-nums text-stone-900">{stat.value}</dd>
        </div>
      ))}
    </dl>
  )
}
