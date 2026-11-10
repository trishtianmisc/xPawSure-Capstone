import { drilldownService } from '../services/drilldown.service'

import { ReadTab } from './ReadTab'

export function ClinicPetsTab({ clinicId }: { clinicId: string }) {
  return (
    <ReadTab
      clinicId={clinicId}
      columns={[
        {
          key: 'name',
          label: 'Pet',
          render: (row) => <span className="font-medium text-stone-900 dark:text-stone-100">{row.name}</span>,
        },
        { key: 'breed', label: 'Breed', render: (row) => row.breed || '—' },
        { key: 'sex', label: 'Sex' },
        { key: 'owner_name', label: 'Owner' },
        {
          key: 'is_active',
          label: 'Status',
          render: (row) => (row.is_active ? 'Active' : 'Inactive'),
        },
        {
          key: 'created_at',
          label: 'Registered',
          render: (row) => new Date(row.created_at).toLocaleDateString(),
        },
      ]}
      emptyMessage="No pets seen at this clinic yet."
      fetcher={drilldownService.listPets}
      queryKey='super-admin-clinic-pets'
      rowKey={(row) => row.id}
      searchPlaceholder="Search pets or owners..."
    />
  )
}
