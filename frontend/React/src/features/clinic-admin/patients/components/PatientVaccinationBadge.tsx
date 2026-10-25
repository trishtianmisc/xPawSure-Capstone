import { Badge } from '../../../../components/ui'
import type { VaccinationStatus } from '../types/patient.types'

const STATUS_CONFIG: Record<
  VaccinationStatus,
  { label: string; variant: 'success' | 'warning' | 'error' | 'default' }
> = {
  up_to_date: { label: 'Up to date', variant: 'success' },
  due_soon: { label: 'Due soon', variant: 'warning' },
  overdue: { label: 'Overdue', variant: 'error' },
  none_recorded: { label: 'None recorded', variant: 'default' },
}

export function PatientVaccinationBadge({
  status,
}: {
  status: VaccinationStatus
}) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.none_recorded
  return <Badge variant={config.variant}>{config.label}</Badge>
}
