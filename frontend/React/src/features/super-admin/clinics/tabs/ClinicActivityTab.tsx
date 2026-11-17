import { Badge } from '../../../../components/ui'
import { formatDateTime } from '../../../../utils/format'
import { drilldownService } from '../services/drilldown.service'

import { ReadTab } from './ReadTab'

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  CHECKED_IN: 'info',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'error',
  NO_SHOW: 'default',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Awaiting confirmation',
  CONFIRMED: 'Confirmed',
  CHECKED_IN: 'Checked in',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No show',
  REVIEW: 'Awaiting scheduling',
}

const TYPE_LABELS: Record<string, string> = {
  CONSULTATION: 'Consultation',
  FOLLOW_UP: 'Follow-up',
  VACCINATION: 'Vaccination',
  AI_REVIEW: 'AI review',
  EMERGENCY: 'Emergency',
}

export function ClinicActivityTab({ clinicId }: { clinicId: string }) {
  return (
    <ReadTab
      clinicId={clinicId}
      columns={[
        {
          key: 'pet_name',
          label: 'Pet',
          render: (row) => <span className="font-medium text-stone-900 dark:text-stone-100">{row.pet_name}</span>,
        },
        { key: 'owner_name', label: 'Owner' },
        { key: 'veterinarian_name', label: 'Veterinarian' },
        {
          key: 'type',
          label: 'Type',
          render: (row) => TYPE_LABELS[row.type] ?? row.type.replaceAll('_', ' ').toLowerCase(),
        },
        {
          key: 'status',
          label: 'Status',
          render: (row) => (
            <Badge variant={STATUS_VARIANTS[row.status] ?? 'default'}>
              {STATUS_LABELS[row.status] ?? row.status.replaceAll('_', ' ').toLowerCase()}
            </Badge>
          ),
        },
        {
          key: 'scheduled_at',
          label: 'Scheduled',
          render: (row) => formatDateTime(row.scheduled_at),
        },
      ]}
      emptyMessage="No appointments at this clinic yet."
      fetcher={drilldownService.listAppointments}
      queryKey='super-admin-clinic-appointments'
      rowKey={(row) => row.id}
      searchPlaceholder="Search appointments..."
    />
  )
}
