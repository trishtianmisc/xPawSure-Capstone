import { manilaDateKey } from '../../../src/utils/datetime'

export type VaccinationTone = 'overdue' | 'due' | 'ok'

export function vaccinationStatus(
  nextDue: string | null,
  isLatest = true,
): { label: string; tone: VaccinationTone } | null {
  if (!nextDue || !isLatest) return null

  const todayKey = manilaDateKey()
  const dueKey = manilaDateKey(nextDue)
  if (!dueKey) return null
  const today = Date.parse(`${todayKey}T00:00:00Z`)
  const due = Date.parse(`${dueKey}T00:00:00Z`)

  const diffDays = Math.round((due - today) / 86400000)
  if (diffDays < 0) return { label: 'Overdue', tone: 'overdue' }
  if (diffDays <= 30) return { label: `Due in ${diffDays}d`, tone: 'due' }
  return { label: 'Up to date', tone: 'ok' }
}
