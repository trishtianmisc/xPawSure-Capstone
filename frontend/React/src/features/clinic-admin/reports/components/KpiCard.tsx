import {
  deltaClasses,
  type Delta,
  type GoodDirection,
} from '../utils/kpiDeltas'

interface KpiCardProps {
  label: string
  value: string
  delta?: Delta | null
  goodDirection?: GoodDirection
  hint?: string
  showDelta?: boolean
  valueClassName?: string
}

export function KpiCard({
  label,
  value,
  delta = null,
  goodDirection = 'up',
  hint,
  showDelta = true,
  valueClassName = 'text-3xl',
}: KpiCardProps) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-800">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
        {label}
      </p>
      <p
        className={`mt-2 font-extrabold tracking-tight text-stone-950 dark:text-stone-100 ${valueClassName}`}
      >
        {value}
      </p>
      {showDelta && (
        <div className="mt-1 flex items-center gap-1.5">
          {delta ? (
            <span
              className={`flex items-center gap-0.5 text-xs font-semibold ${deltaClasses(delta.direction, goodDirection)}`}
            >
              {delta.direction !== 'flat' && (
                <svg
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d={
                      delta.direction === 'up'
                        ? 'M5 10l7-7m0 0l7 7m-7-7v18'
                        : 'M19 14l-7 7m0 0l-7-7m7 7V3'
                    }
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              )}
              {delta.text}
            </span>
          ) : (
            <span className="text-xs font-semibold text-stone-400 dark:text-stone-500">
              &mdash;
            </span>
          )}
        </div>
      )}
      {hint && (
        <p className="mt-0.5 text-[11px] text-stone-400 dark:text-stone-500">
          {hint}
        </p>
      )}
    </div>
  )
}
