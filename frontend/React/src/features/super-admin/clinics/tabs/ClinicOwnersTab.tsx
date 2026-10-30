import { drilldownService } from '../services/drilldown.service'

import { ReadTab } from './ReadTab'

export function ClinicOwnersTab({ clinicId }: { clinicId: string }) {
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
        { key: 'phone', label: 'Phone', render: (row) => row.phone || '—' },
        {
          key: 'created_at',
          label: 'Registered',
          render: (row) => new Date(row.created_at).toLocaleDateString(),
        },
      ]}
      emptyMessage="No pet owners at this clinic yet."
      fetcher={drilldownService.listOwners}
      queryKey='super-admin-clinic-owners'
      rowKey={(row) => row.id}
      searchPlaceholder="Search owners..."
    />
  )
}
