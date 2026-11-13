import { useState } from 'react'

import type { ScreeningAnswer } from '../types/dashboard.types'
import { DetailCell, DetailSection } from './DetailSection'

const INITIAL_VISIBLE_ROWS = 5

export function SymptomAnswersCard({ rows }: { rows: ScreeningAnswer[] }) {
  const [expanded, setExpanded] = useState(false)

  if (rows.length === 0) return null

  const canToggle = rows.length > INITIAL_VISIBLE_ROWS
  const visibleRows = expanded ? rows : rows.slice(0, INITIAL_VISIBLE_ROWS)

  return (
    <DetailSection
      action={
        canToggle ? (
          <button
            className="shrink-0 text-sm font-semibold text-amber-700 transition hover:text-amber-800 dark:text-amber-500 dark:hover:text-amber-400"
            onClick={() => setExpanded((current) => !current)}
            type="button"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        ) : null
      }
      title="Questionnaire Answers"
    >
      {visibleRows.map((row, index) => (
        <DetailCell
          key={`${row.question}-${index}`}
          label={row.question}
          value={row.answer}
        />
      ))}
    </DetailSection>
  )
}
