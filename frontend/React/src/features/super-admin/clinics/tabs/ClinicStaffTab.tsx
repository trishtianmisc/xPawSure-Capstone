import { Badge } from '../../../../components/ui'
import { drilldownService } from '../services/drilldown.service'

import { ReadTab } from './ReadTab'

export function ClinicStaffTab({ clinicId }: { clinicId: string }) {
  return (
    <ReadTab
      clinicId={clinicId}
      columns={[
        {
          key: 'name',
          label: 'Name',
          render: (row) => (
            <span className="font-medium text-stone-900 dark:text-stone-100">
              {row.first_name} {row.last_name}
            </span>
          ),
        },
        { key: 'email', label: 'Email' },
        {
          key: 'role',
          label: 'Role',
          render: (row) => <Badge variant={row.role === 'CLINIC_ADMIN' ? 'info' : 'default'}>{row.role}</Badge>,
        },
        {
          key: 'is_active',
          label: 'Status',
          render: (row) => (
            <Badge variant={row.is_active ? 'success' : 'error'}>
              {row.is_active ? 'Active' : 'Deactivated'}
            </Badge>
          ),
        },
        {
          key: 'license_number',
          label: 'License',
          render: (row) => row.license_number ?? '—',
        },
      ]}
      emptyMessage="No staff members at this clinic."
      fetcher={drilldownService.listStaff}
      queryKey='super-admin-clinic-staff'
      rowKey={(row) => row.id}
      searchPlaceholder="Search staff..."
    />
  )
}
