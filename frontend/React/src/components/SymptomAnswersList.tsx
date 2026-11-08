export interface SymptomAnswerRow {
  question: string
  answer: string
}

interface SymptomAnswersListProps {
  rows: SymptomAnswerRow[] | null | undefined
}

/**
 * Owner questionnaire answers for a screening — display-only supplementary
 * context for the treatment team. Renders nothing when there are no stored
 * rows (legacy screenings or saves without a questionnaire).
 */
export function SymptomAnswersList({ rows }: SymptomAnswersListProps) {
  if (!rows || rows.length === 0) return null

  return (
    <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900">
      <p className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
        Owner's questionnaire answers ({rows.length})
      </p>
      <dl className="mt-3 space-y-3">
        {rows.map((row) => (
          <div key={row.question}>
            <dt className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              {row.question}
            </dt>
            <dd className="mt-0.5 text-sm text-stone-600 dark:text-stone-400">
              {row.answer}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs italic text-stone-500 dark:text-stone-400">
        Supplementary context reported by the owner. These answers do not change
        the AI prediction or confidence.
      </p>
    </div>
  )
}
