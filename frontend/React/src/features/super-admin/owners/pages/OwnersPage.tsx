import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Alert, Badge, Button, Card } from '../../../../components/ui'
import { useDebounce } from '../../../../hooks/useDebounce'
import { apiErrorMessage } from '../../../../utils/error'
import { DashboardLayout } from '../../dashboard/components/DashboardLayout'
import { clinicService } from '../../clinics/services/clinic.service'
import { EditContactModal } from '../components/EditContactModal'
import { useOwners } from '../hooks/useOwners'

import type { OwnerListItem } from '../types/owner.types'

const PAGE_SIZE = 20

export function OwnersPage() {
  const [search, setSearch] = useState('')
  const [clinicFilter, setClinicFilter] = useState('')
  const [page, setPage] = useState(1)
  const [editingOwner, setEditingOwner] = useState<OwnerListItem | null>(null)

  const debouncedSearch = useDebounce(search, 300)

  const { data: clinics } = useQuery({
    queryKey: ['clinics', { page_size: 100 }],
    queryFn: () => clinicService.list({ page_size: 100 }),
    staleTime: 60_000,
  })

  const params = useMemo(() => ({
    search: debouncedSearch || undefined,
    clinic_id: clinicFilter || undefined,
    page,
    page_size: PAGE_SIZE,
  }), [debouncedSearch, clinicFilter, page])

  const { data, isLoading, error } = useOwners(params)

  const queryError = error ? apiErrorMessage(error) : null
  const hasFilters = Boolean(debouncedSearch || clinicFilter)

  function clearFilters() {
    setSearch('')
    setClinicFilter('')
    setPage(1)
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="rounded-md bg-gradient-to-br from-amber-900 to-amber-950 p-7 sm:p-9">
            <h1 className="text-3xl font-bold tracking-tight text-white">Pet Owners</h1>
            <p className="mt-1 text-amber-100/80">
              Cross-clinic owner directory. Contact info can be edited; email and roles cannot.
            </p>
          </div>
        </div>

        {queryError && (
          <div className="mb-6">
            <Alert variant="error">{queryError}</Alert>
          </div>
        )}

        <Card padding="md">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative">
              <input
                className="w-full rounded-md border border-stone-200 bg-white px-4 py-2.5 pl-10 text-sm text-stone-900 placeholder-stone-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500 dark:focus:border-amber-500 dark:focus:ring-amber-900/40"
                placeholder="Search name, email..."
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
            </div>
            <select
              className="rounded-md border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-700 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:focus:border-amber-500 dark:focus:ring-amber-900/40"
              value={clinicFilter}
              onChange={(e) => { setClinicFilter(e.target.value); setPage(1) }}
            >
              <option value="">All clinics</option>
              {clinics?.results.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
              ))}
            </select>
            {hasFilters && (
              <div>
                <Button size="sm" variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              </div>
            )}
          </div>
        </Card>

        <div className="mt-6 overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
            </div>
          ) : !data || data.results.length === 0 ? (
            <div className="py-16 text-center">
              <svg className="mx-auto h-12 w-12 text-stone-300 dark:text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6-4a4 4 0 11-4-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-stone-600 dark:text-stone-400">No owners found</h3>
              <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
                {hasFilters ? 'Try adjusting your search or clinic filter.' : 'Owners will appear here once they register.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50 text-stone-500 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-400">
                    <th className="px-5 py-4 font-semibold">Owner</th>
                    <th className="px-5 py-4 font-semibold">Email</th>
                    <th className="px-5 py-4 font-semibold">Phone</th>
                    <th className="px-5 py-4 font-semibold">Address</th>
                    <th className="px-5 py-4 font-semibold">Pets</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                  {data.results.map((owner) => (
                    <tr key={owner.id} className="transition hover:bg-amber-50/50 dark:hover:bg-amber-900/10">
                      <td className="whitespace-nowrap px-5 py-4 font-medium text-stone-800 dark:text-stone-200">
                        {owner.first_name} {owner.last_name}
                      </td>
                      <td className="px-5 py-4 text-stone-500 dark:text-stone-400">{owner.email}</td>
                      <td className="px-5 py-4 text-stone-500 dark:text-stone-400">{owner.phone || '—'}</td>
                      <td className="max-w-56 truncate px-5 py-4 text-stone-500 dark:text-stone-400" title={owner.address ?? undefined}>
                        {owner.address || '—'}
                      </td>
                      <td className="px-5 py-4 text-stone-700 dark:text-stone-300">{owner.pet_count}</td>
                      <td className="px-5 py-4">
                        <Badge variant={owner.is_active ? 'success' : 'default'}>
                          {owner.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button size="sm" variant="secondary" onClick={() => setEditingOwner(owner)}>
                          Edit contact
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data && data.total_pages > 1 && (
            <div className="flex items-center justify-between border-t border-stone-100 px-5 py-4 dark:border-stone-700">
              <span className="text-sm text-stone-500 dark:text-stone-400">
                Page {data.page} of {data.total_pages} ({data.total} total)
              </span>
              <div className="flex gap-2">
                <Button
                  disabled={page <= 1}
                  size="sm"
                  variant="secondary"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  disabled={page >= data.total_pages}
                  size="sm"
                  variant="secondary"
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        <EditContactModal
          key={editingOwner?.id ?? 'closed'}
          ownerId={editingOwner?.id ?? null}
          open={Boolean(editingOwner)}
          onClose={() => setEditingOwner(null)}
        />
      </div>
    </DashboardLayout>
  )
}
