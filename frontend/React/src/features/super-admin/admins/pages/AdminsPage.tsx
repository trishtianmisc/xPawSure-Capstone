import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Alert, Badge, Button, Card } from '../../../../components/ui'
import { useToast } from '../../../../components/ui/ToastContext'
import { useDebounce } from '../../../../hooks/useDebounce'
import { apiErrorMessage } from '../../../../utils/error'
import { DashboardLayout } from '../../dashboard/components/DashboardLayout'
import { useAdminAction, useClinicAdmins } from '../hooks/useAdmins'

import type { ClinicAdmin } from '../types/admin.types'

const PAGE_SIZE = 20

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  ACTIVE: 'success',
  DEACTIVATED: 'error',
  PENDING: 'warning',
}

function statusOf(admin: ClinicAdmin): string {
  if (!admin.is_active) return 'DEACTIVATED'
  if (admin.must_change_password) return 'PENDING'
  return 'ACTIVE'
}

export function AdminsPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(search, 300)

  const params = useMemo(() => ({
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    page,
    page_size: PAGE_SIZE,
  }), [debouncedSearch, statusFilter, page])

  const { data, isLoading, error } = useClinicAdmins(params)
  const actionMutation = useAdminAction()

  function runAction(admin: ClinicAdmin, action: 'resend-credentials' | 'deactivate' | 'activate') {
    const label = `${admin.first_name} ${admin.last_name}`
    const confirmText =
      action === 'deactivate'
        ? `Deactivate ${label}? They will no longer be able to sign in.`
        : action === 'activate'
          ? `Reactivate ${label}?`
          : `Email a new temporary password to ${label}? Their current sessions will be signed out.`

    if (!window.confirm(confirmText)) return

    actionMutation.mutate(
      { adminUserId: admin.id, action },
      {
        onSuccess: () => {
          showToast(
            action === 'resend-credentials'
              ? 'Temporary credentials sent.'
              : action === 'deactivate'
                ? 'Account deactivated.'
                : 'Account activated.',
            'success',
          )
        },
        onError: (err) => showToast(apiErrorMessage(err), 'error'),
      },
    )
  }

  const queryError = error ? apiErrorMessage(error) : null

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="rounded-md bg-gradient-to-br from-amber-900 to-amber-950 p-7 sm:p-9">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">Clinic Admins</h1>
                <p className="mt-1 text-amber-100/80">
                  Every Clinic Admin account across all clinics. Create additional admins, resend credentials, or deactivate accounts.
                </p>
              </div>
              <button
                className="shrink-0 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-400"
                onClick={() => navigate('/super-admin/clinics')}
                type="button"
              >
                Manage Clinics
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
                placeholder="Search by name, email, or clinic..."
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
              <option value="PENDING">Pending setup</option>
              <option value="DEACTIVATED">Deactivated</option>
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
                <path d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6-4a4 4 0 11-4-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-stone-600 dark:text-stone-400">No admin accounts found</h3>
              <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
                {search || statusFilter
                  ? 'Try adjusting your search or filters.'
                  : 'Admins are created when you register a clinic, or added from a clinic’s detail page.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50 text-stone-500 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-400">
                    <th className="px-5 py-4 font-semibold">Name</th>
                    <th className="px-5 py-4 font-semibold">Email</th>
                    <th className="px-5 py-4 font-semibold">Clinic</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Last login</th>
                    <th className="px-5 py-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                  {data.results.map((admin) => {
                    const status = statusOf(admin)
                    return (
                      <tr key={admin.id} className="transition hover:bg-amber-50/50 dark:hover:bg-amber-900/10">
                        <td className="px-5 py-4 font-medium text-stone-900 dark:text-stone-100">
                          {admin.first_name} {admin.last_name}
                        </td>
                        <td className="px-5 py-4 text-stone-500 dark:text-stone-400">{admin.email}</td>
                        <td className="px-5 py-4">
                          <button
                            className="rounded-lg px-2 py-1 text-left text-amber-700 transition hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                            type="button"
                            onClick={() => navigate(`/super-admin/clinics/${admin.clinic_id}`)}
                          >
                            {admin.clinic_name}
                          </button>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant={STATUS_VARIANTS[status] ?? 'default'}>{status}</Badge>
                        </td>
                        <td className="px-5 py-4 text-stone-500 dark:text-stone-400">
                          {admin.last_login ? new Date(admin.last_login).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700"
                              disabled={actionMutation.isPending}
                              type="button"
                              onClick={() => runAction(admin, 'resend-credentials')}
                            >
                              Resend credentials
                            </button>
                            {admin.is_active ? (
                              <button
                                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                disabled={actionMutation.isPending}
                                type="button"
                                onClick={() => runAction(admin, 'deactivate')}
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-600 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                                disabled={actionMutation.isPending}
                                type="button"
                                onClick={() => runAction(admin, 'activate')}
                              >
                                Activate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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
