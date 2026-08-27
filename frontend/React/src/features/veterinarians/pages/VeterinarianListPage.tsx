import { useMemo, useState } from 'react'

import { Button, Card } from '../../../components/ui'
import { useDebounce } from '../../../hooks/useDebounce'
import { useVeterinarians } from '../hooks/useVeterinarians'
import { AddVeterinarianModal } from '../components/AddVeterinarianModal'
import type { Veterinarian } from '../types/veterinarian.types'

const PAGE_SIZE = 10

export function VeterinarianListPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sort, setSort] = useState('-created_at')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)

  const debouncedSearch = useDebounce(search, 300)

  const params = useMemo(() => ({
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    sort,
    page,
    page_size: PAGE_SIZE,
  }), [debouncedSearch, statusFilter, sort, page])

  const { data, isLoading, isError } = useVeterinarians(params)

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <div className="rounded-md bg-gradient-to-br from-amber-900 to-amber-950 p-7 sm:p-9">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">Veterinarians</h1>
                <p className="mt-1 text-amber-100/80">Manage veterinarian accounts in your clinic.</p>
              </div>
              <Button
                className="shrink-0 bg-amber-500 hover:bg-amber-400"
                onClick={() => setModalOpen(true)}
              >
                + Add Veterinarian
              </Button>
            </div>
          </div>
        </div>

        <Card padding="md">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1">
              <input
                className="w-full rounded-md border border-stone-200 bg-white px-4 py-2.5 pl-10 text-sm text-stone-900 placeholder-stone-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500 dark:focus:border-amber-500 dark:focus:ring-amber-900/40"
                placeholder="Search by name, email, or license..."
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </Card>

        <div className="mt-6 overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
            </div>
          ) : isError ? (
            <div className="py-16 text-center">
              <svg className="mx-auto h-12 w-12 text-stone-300 dark:text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-stone-600 dark:text-stone-400">Failed to load</h3>
              <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
                Something went wrong. Please try again.
              </p>
            </div>
          ) : !data || data.results.length === 0 ? (
            <div className="py-16 text-center">
              <svg className="mx-auto h-12 w-12 text-stone-300 dark:text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-stone-600 dark:text-stone-400">No veterinarians found</h3>
              <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
                {search || statusFilter
                  ? 'Try adjusting your search or filters.'
                  : 'Add your first veterinarian to get started.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50 text-stone-500 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-400">
                    <th
                      className="cursor-pointer px-5 py-4 font-semibold"
                      onClick={() => setSort(sort === 'first_name' ? '-first_name' : 'first_name')}
                    >
                      Name {sort === 'first_name' && '↑'}{sort === '-first_name' && '↓'}
                    </th>
                    <th
                      className="cursor-pointer px-5 py-4 font-semibold"
                      onClick={() => setSort(sort === 'email' ? '-email' : 'email')}
                    >
                      Email {sort === 'email' && '↑'}{sort === '-email' && '↓'}
                    </th>
                    <th className="px-5 py-4 font-semibold">License #</th>
                    <th className="px-5 py-4 font-semibold">License Expiry</th>
                    <th
                      className="cursor-pointer px-5 py-4 font-semibold"
                      onClick={() => setSort(sort === '-created_at' ? 'created_at' : '-created_at')}
                    >
                      Status {sort === 'created_at' && '↑'}{sort === '-created_at' && '↓'}
                    </th>
                    <th
                      className="cursor-pointer px-5 py-4 font-semibold"
                      onClick={() => setSort(sort === 'created_at' ? '-created_at' : 'created_at')}
                    >
                      Created {sort === 'created_at' && '↑'}{sort === '-created_at' && '↓'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                  {data.results.map((vet: Veterinarian) => (
                    <tr
                      key={vet.id}
                      className="transition hover:bg-amber-50/50 dark:hover:bg-amber-900/10"
                    >
                      <td className="px-5 py-4 font-medium text-stone-900 dark:text-stone-100">
                        {vet.first_name} {vet.last_name}
                      </td>
                      <td className="px-5 py-4 text-stone-500 dark:text-stone-400">{vet.email}</td>
                      <td className="px-5 py-4 text-stone-500 dark:text-stone-400">
                        {vet.license_number || '—'}
                      </td>
                      <td className="px-5 py-4 text-stone-500 dark:text-stone-400">
                        {vet.license_expiration_date
                          ? new Date(vet.license_expiration_date).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                            vet.is_active
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}
                        >
                          {vet.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-stone-500 dark:text-stone-400">
                        {new Date(vet.created_at).toLocaleDateString()}
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

      <AddVeterinarianModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
