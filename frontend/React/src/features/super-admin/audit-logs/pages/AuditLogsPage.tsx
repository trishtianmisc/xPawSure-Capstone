import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Alert, Badge, Button, Card } from '../../../../components/ui'
import { useDebounce } from '../../../../hooks/useDebounce'
import { apiErrorMessage } from '../../../../utils/error'
import { DashboardLayout } from '../../dashboard/components/DashboardLayout'
import { clinicService } from '../../clinics/services/clinic.service'
import { useAuditLogs } from '../hooks/useAuditLogs'

import type { AuditLogEntry } from '../types/auditLog.types'

const PAGE_SIZE = 25

const ACTION_VARIANTS: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'error',
  LOGIN: 'default',
  LOGOUT: 'default',
  REGISTER: 'success',
  PASSWORD_CHANGE: 'warning',
  PASSWORD_RESET: 'warning',
}

function actionVariant(action: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
  return ACTION_VARIANTS[action] ?? 'default'
}

export function AuditLogsPage() {
  const [search, setSearch] = useState('')
  const [clinicFilter, setClinicFilter] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
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
    module: moduleFilter || undefined,
    action: actionFilter || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    page,
    page_size: PAGE_SIZE,
  }), [debouncedSearch, clinicFilter, moduleFilter, actionFilter, dateFrom, dateTo, page])

  const { data, isLoading, error } = useAuditLogs(params)

  const queryError = error ? apiErrorMessage(error) : null
  const hasFilters = Boolean(debouncedSearch || clinicFilter || moduleFilter || actionFilter || dateFrom || dateTo)

  function clearFilters() {
    setSearch('')
    setClinicFilter('')
    setModuleFilter('')
    setActionFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="rounded-md bg-gradient-to-br from-amber-900 to-amber-950 p-7 sm:p-9">
            <h1 className="text-3xl font-bold tracking-tight text-white">Audit Logs</h1>
            <p className="mt-1 text-amber-100/80">
              Cross-clinic activity trail. Filter by clinic, module, action, or date range.
            </p>
          </div>
        </div>

        {queryError && (
          <div className="mb-6">
            <Alert variant="error">{queryError}</Alert>
          </div>
        )}

        <Card padding="md">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div className="relative">
              <input
                className="w-full rounded-md border border-stone-200 bg-white px-4 py-2.5 pl-10 text-sm text-stone-900 placeholder-stone-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500 dark:focus:border-amber-500 dark:focus:ring-amber-900/40"
                placeholder="Search description..."
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
            <select
              className="rounded-md border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-700 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:focus:border-amber-500 dark:focus:ring-amber-900/40"
              value={moduleFilter}
              onChange={(e) => { setModuleFilter(e.target.value); setPage(1) }}
            >
              <option value="">All modules</option>
              <option value="CLINIC">Clinic</option>
              <option value="STAFF">Staff</option>
              <option value="users">Users</option>
              <option value="appointments">Appointments</option>
            </select>
            <select
              className="rounded-md border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-700 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:focus:border-amber-500 dark:focus:ring-amber-900/40"
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
            >
              <option value="">All actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="REGISTER">Register</option>
              <option value="PASSWORD_CHANGE">Password change</option>
              <option value="PASSWORD_RESET">Password reset</option>
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
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-stone-600 dark:text-stone-400">No audit entries found</h3>
              <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
                {hasFilters ? 'Try adjusting your filters.' : 'Activity will appear here as clinics and staff use the system.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50 text-stone-500 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-400">
                    <th className="px-5 py-4 font-semibold">Timestamp</th>
                    <th className="px-5 py-4 font-semibold">Action</th>
                    <th className="px-5 py-4 font-semibold">Module</th>
                    <th className="px-5 py-4 font-semibold">Description</th>
                    <th className="px-5 py-4 font-semibold">IP address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                  {data.results.map((entry: AuditLogEntry) => (
                    <tr key={entry.id} className="transition hover:bg-amber-50/50 dark:hover:bg-amber-900/10">
                      <td className="whitespace-nowrap px-5 py-4 text-stone-500 dark:text-stone-400">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={actionVariant(entry.action)}>{entry.action}</Badge>
                      </td>
                      <td className="px-5 py-4 text-stone-500 dark:text-stone-400">{entry.module}</td>
                      <td className="px-5 py-4 text-stone-700 dark:text-stone-300">{entry.description || '—'}</td>
                      <td className="px-5 py-4 text-stone-400 dark:text-stone-500">{entry.ip_address || '—'}</td>
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
