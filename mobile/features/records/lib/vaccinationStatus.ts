export type VaccinationTone = 'overdue' | 'due' | 'ok'

export function vaccinationStatus(
  nextDue: string | null,
  isLatest = true,
): { label: string; tone: VaccinationTone } | null {
  if (!nextDue || !isLatest) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(nextDue)
  due.setHours(0, 0, 0, 0)

  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000)
  if (diffDays < 0) return { label: 'Overdue', tone: 'overdue' }
  if (diffDays <= 30) return { label: `Due in ${diffDays}d`, tone: 'due' }
  return { label: 'Up to date', tone: 'ok' }
}
