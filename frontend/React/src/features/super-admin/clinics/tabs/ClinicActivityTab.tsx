import { Badge } from '../../../../components/ui'
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
        { key: 'type', label: 'Type' },
        {
          key: 'status',
          label: 'Status',
          render: (row) => (
            <Badge variant={STATUS_VARIANTS[row.status] ?? 'default'}>{row.status.replace('_', ' ')}</Badge>
          ),
        },
        {
          key: 'scheduled_at',
          label: 'Scheduled',
          render: (row) => new Date(row.scheduled_at).toLocaleString(),
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
