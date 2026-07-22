import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { Alert, Badge, Button, Card } from '../../../../components/ui'
import { useDebounce } from '../../../../hooks/useDebounce'
import { DashboardLayout } from '../../dashboard/components/DashboardLayout'
import {
  clinicService,
} from '../services/clinic.service'

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  ACTIVE: 'success',
  INACTIVE: 'warning',
  SUSPENDED: 'error',
  ARCHIVED: 'default',
}

const PAGE_SIZE = 20

export function ClinicListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sort, setSort] = useState('-created_at')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(search, 300)

  const params = useMemo(() => ({
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    sort,
    page,
    page_size: PAGE_SIZE,
  }), [debouncedSearch, statusFilter, sort, page])

  const { data, isLoading, error } = useQuery({
    queryKey: ['clinics', params],
    queryFn: () => clinicService.list(params),
    staleTime: 30_000,
  })

  const queryError = error instanceof Error ? error.message : null

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="rounded-md bg-gradient-to-br from-amber-900 to-amber-950 p-7 sm:p-9">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">Clinics</h1>
                <p className="mt-1 text-amber-100/80">Manage all registered veterinary clinics.</p>
              </div>
              <button
                className="shrink-0 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-400"
                onClick={() => navigate('/super-admin/clinics/new')}
                type="button"
              >
                + New Clinic
              </button>
            </div>
          </div>
        </div>

        {queryError && (
          <div className="mb-6">
            <Alert variant="error">{queryError}</Alert>
          </div>
        )}

        <Card padding="md">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1">
              <input
                className="w-full rounded-md border border-stone-200 bg-white px-4 py-2.5 pl-10 text-sm text-stone-900 placeholder-stone-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500 dark:focus:border-amber-500 dark:focus:ring-amber-900/40"
                placeholder="Search clinics..."
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
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="ARCHIVED">Archived</option>
            </select>
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
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-stone-600 dark:text-stone-400">No clinics found</h3>
              <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
                {search || statusFilter ? 'Try adjusting your search or filters.' : 'Register your first clinic to get started.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50 text-stone-500 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-400">
                    <th
                      className="cursor-pointer px-5 py-4 font-semibold"
                      onClick={() => setSort(sort === 'name' ? '-name' : 'name')}
                    >
                      Name {sort === 'name' && '↑'}{sort === '-name' && '↓'}
                    </th>
                    <th className="px-5 py-4 font-semibold">Email</th>
                    <th className="px-5 py-4 font-semibold">Phone</th>
                    <th
                      className="cursor-pointer px-5 py-4 font-semibold"
                      onClick={() => setSort(sort === 'status' ? '-status' : 'status')}
                    >
                      Status {sort === 'status' && '↑'}{sort === '-status' && '↓'}
                    </th>
                    <th
                      className="cursor-pointer px-5 py-4 font-semibold"
                      onClick={() => setSort(sort === 'created_at' ? '-created_at' : 'created_at')}
                    >
                      Created {sort === 'created_at' && '↑'}{sort === '-created_at' && '↓'}
                    </th>
                    <th className="px-5 py-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                  {data.results.map((clinic) => (
                    <tr
                      key={clinic.id}
                      className="cursor-pointer transition hover:bg-amber-50/50 dark:hover:bg-amber-900/10"
                      onClick={() => navigate(`/super-admin/clinics/${clinic.id}`)}
                    >
                      <td className="px-5 py-4 font-medium text-stone-900 dark:text-stone-100">{clinic.name}</td>
                      <td className="px-5 py-4 text-stone-500 dark:text-stone-400">{clinic.email}</td>
                      <td className="px-5 py-4 text-stone-500 dark:text-stone-400">{clinic.phone || '—'}</td>
                      <td className="px-5 py-4">
                        <Badge variant={STATUS_VARIANTS[clinic.status] ?? 'default'}>
                          {clinic.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-stone-500 dark:text-stone-400">
                        {new Date(clinic.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          className="rounded-lg px-3 py-1.5 text-sm font-medium text-amber-700 transition hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                          type="button"
                          onClick={(e) => { e.stopPropagation(); navigate(`/super-admin/clinics/${clinic.id}`) }}
                        >
                          View
                        </button>
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
      </div>
    </DashboardLayout>
  )
}
