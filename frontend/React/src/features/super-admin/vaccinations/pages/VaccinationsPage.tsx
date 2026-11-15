import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Alert, Badge, Button, Card } from '../../../../components/ui'
import { useDebounce } from '../../../../hooks/useDebounce'
import { apiErrorMessage } from '../../../../utils/error'
import { formatDate } from '../../../../utils/format'
import { DashboardLayout } from '../../dashboard/components/DashboardLayout'
import { clinicService } from '../../clinics/services/clinic.service'
import { useVaccinations } from '../hooks/useVaccinations'

const PAGE_SIZE = 20

export function VaccinationsPage() {
  const [search, setSearch] = useState('')
  const [clinicFilter, setClinicFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(search, 300)

  const { data: clinics } = useQuery({
    queryKey: ['clinics', { page_size: 100 }],
    queryFn: () => clinicService.list({ page_size: 100 }),
    staleTime: 60_000,
  })

  const params = useMemo(() => ({
    search: debouncedSearch || undefined,
    clinic_id: clinicFilter || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    page,
    page_size: PAGE_SIZE,
  }), [debouncedSearch, clinicFilter, dateFrom, dateTo, page])

  const { data, isLoading, error } = useVaccinations(params)

  const queryError = error ? apiErrorMessage(error) : null
  const hasFilters = Boolean(debouncedSearch || clinicFilter || dateFrom || dateTo)

  function clearFilters() {
    setSearch('')
    setClinicFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="rounded-md bg-gradient-to-br from-amber-900 to-amber-950 p-7 sm:p-9">
            <h1 className="text-3xl font-bold tracking-tight text-white">Vaccinations</h1>
            <p className="mt-1 text-amber-100/80">
              Read-only cross-clinic vaccination records. Medical history is never modified here.
            </p>
          </div>
        </div>

        {queryError && (
          <div className="mb-6">
            <Alert variant="error">{queryError}</Alert>
          </div>
        )}

        <Card padding="md">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <input
                className="w-full rounded-md border border-stone-200 bg-white px-4 py-2.5 pl-10 text-sm text-stone-900 placeholder-stone-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500 dark:focus:border-amber-500 dark:focus:ring-amber-900/40"
                placeholder="Search vaccine, pet, owner..."
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
            <input
              className="rounded-md border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-700 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:focus:border-amber-500 dark:focus:ring-amber-900/40"
              title="From date"
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
            />
            <input
              className="rounded-md border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-700 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:focus:border-amber-500 dark:focus:ring-amber-900/40"
              title="To date"
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
            />
          </div>
          {hasFilters && (
            <div className="mt-3">
              <Button size="sm" variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          )}
        </Card>

        <div className="mt-6 overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
            </div>
          ) : !data || data.results.length === 0 ? (
            <div className="py-16 text-center">
              <svg className="mx-auto h-12 w-12 text-stone-300 dark:text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-stone-600 dark:text-stone-400">No vaccination records found</h3>
              <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
                {hasFilters ? 'Try adjusting your filters.' : 'Records will appear here once vets log vaccinations.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50 text-stone-500 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-400">
                    <th className="px-5 py-4 font-semibold">Date given</th>
                    <th className="px-5 py-4 font-semibold">Vaccine</th>
                    <th className="px-5 py-4 font-semibold">Pet</th>
                    <th className="px-5 py-4 font-semibold">Owner</th>
                    <th className="px-5 py-4 font-semibold">Veterinarian</th>
                    <th className="px-5 py-4 font-semibold">Next due</th>
                    <th className="px-5 py-4 font-semibold">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                  {data.results.map((record) => (
                    <tr key={record.id} className="transition hover:bg-amber-50/50 dark:hover:bg-amber-900/10">
                      <td className="whitespace-nowrap px-5 py-4 text-stone-500 dark:text-stone-400">
                        {formatDate(record.date_given)}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-stone-800 dark:text-stone-200">{record.name}</p>
                        {record.dose && (
                          <p className="text-xs text-stone-400 dark:text-stone-500">{record.dose}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-stone-700 dark:text-stone-300">{record.pet_name}</td>
                      <td className="px-5 py-4 text-stone-500 dark:text-stone-400">{record.owner_name || '—'}</td>
                      <td className="px-5 py-4 text-stone-500 dark:text-stone-400">{record.veterinarian || '—'}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-stone-500 dark:text-stone-400">
                        {record.next_due ? formatDate(record.next_due) : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={record.source === 'VET' ? 'success' : 'default'}>
                          {record.source === 'VET' ? 'Vet' : 'Owner'}
                        </Badge>
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
