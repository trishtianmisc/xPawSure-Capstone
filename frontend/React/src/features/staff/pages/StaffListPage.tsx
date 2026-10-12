import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStaff } from '../hooks/useStaff'
import { useStaffStats } from '../hooks/useStaffStats'
import { useStaffAction } from '../hooks/useStaffAction'
import { AddStaffModal } from '../components/AddStaffModal'
import { BulkUploadModal } from '../components/BulkUploadModal'
import { EditStaffModal } from '../components/EditStaffModal'
import { useDebounce } from '../../../hooks/useDebounce'
import { Button, Card } from '../../../components/ui'
import { useToast } from '../../../components/ui/ToastContext'
import { PageHero } from '../../receptionist/components/PageHero'
import { StatCard } from '../../clinic-admin/dashboard/components/StatCard'
import { formatPhone } from '../../../utils/format'
import type { StaffMember } from '../types/staff.types'

type Tab = 'ALL' | 'VETERINARIAN' | 'RECEPTIONIST'
type StatusFilter = '' | 'ACTIVE' | 'PENDING' | 'DEACTIVATED'

const DAYS_SOON_THRESHOLD = 90

function getInitials(first: string, last: string): string {
  return ((first?.[0] ?? '') + (last?.[0] ?? '')).toUpperCase()
}

function AvatarCell({ staff }: { staff: StaffMember }) {
  const bg = staff.role === 'VETERINARIAN'
    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
  return (
    <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${bg}`}>
      {getInitials(staff.first_name, staff.last_name)}
    </span>
  )
}

function LicenseCell({ staff }: { staff: StaffMember }) {
  if (!staff.license_number) {
    return <span className="text-stone-400 dark:text-stone-500">—</span>
  }

  const expiry = staff.license_expiration_date ? new Date(`${staff.license_expiration_date}T00:00:00`) : null
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let icon: { color: string; path: string; label: string } | null = null
  if (expiry) {
    if (expiry < today) {
      icon = {
        color: 'text-red-600 dark:text-red-400',
        path: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z',
        label: 'Expired',
      }
    } else {
      const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays <= DAYS_SOON_THRESHOLD) {
        icon = {
          color: 'text-amber-600 dark:text-amber-400',
          path: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z',
          label: diffDays <= 30 ? `Expires in ${diffDays}d` : `Expires in ${diffDays}d`,
        }
      }
    }
  }

  return (
    <div>
      <p className="font-medium text-stone-900 dark:text-stone-100">{staff.license_number}</p>
      <div className="mt-0.5 flex flex-nowrap items-center gap-1.5">
        {expiry && (
          <span className="whitespace-nowrap text-xs text-stone-400">
            {expiry.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        )}
        {icon && (
          <span className={`inline-flex items-center gap-1 whitespace-nowrap text-[10px] font-semibold ${icon.color}`}>
            <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d={icon.path} />
            </svg>
            {icon.label}
          </span>
        )}
      </div>
    </div>
  )
}

function ActionsCell({
  staff,
  onEdit,
}: {
  staff: StaffMember
  onEdit: (s: StaffMember) => void
}) {
  const [open, setOpen] = useState(false)
  const actionMutation = useStaffAction()
  const { showToast } = useToast()

  const handleAction = async (action: string) => {
    setOpen(false)
    try {
      const result = await actionMutation.mutateAsync({ id: staff.id, action })
      showToast(result.detail, 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Action failed.', 'error')
    }
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M12 5v.01M12 12v.01M12 19v.01" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpen(false) }} />
          <div className="absolute right-0 z-50 mt-1 w-48 rounded-lg border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-900">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(staff); setOpen(false) }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
              Edit
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleAction('reset-password') }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
              Reset Password
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleAction('resend-welcome') }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
              Resend Welcome
            </button>
            {staff.is_active ? (
              <button
                onClick={(e) => { e.stopPropagation(); handleAction('deactivate') }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                Deactivate
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); handleAction('activate') }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                Activate
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export function StaffListPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('ALL')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)

  const debouncedSearch = useDebounce(search, 300)
  const roleParam = tab === 'ALL' ? undefined : tab

  const { data: stats, isLoading: statsLoading } = useStaffStats()
  const { data, isLoading, error, refetch, isFetching } = useStaff({
    role: roleParam,
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    page,
    page_size: 10,
  })

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'ALL', label: 'All Staff', count: stats?.total ?? 0 },
    { key: 'VETERINARIAN', label: 'Veterinarians', count: stats?.veterinarians ?? 0 },
    { key: 'RECEPTIONIST', label: 'Receptionists', count: stats?.receptionists ?? 0 },
  ]

  const startItem = data ? (data.page - 1) * data.page_size + 1 : 0
  const endItem = data ? Math.min(data.page * data.page_size, data.total) : 0

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
      <PageHero
        title="Staff Management"
        subtitle="Manage veterinarians and receptionists."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="shrink-0 rounded-md border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              type="button"
            >
              Upload CSV
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="shrink-0 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-400"
              type="button"
            >
              + Add Staff
            </button>
          </div>
        }
      />

        {/* Stats Strip */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statsLoading ? (
            <>
              <div className="animate-pulse rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-800"><div className="h-12 w-12 rounded-xl bg-stone-200 dark:bg-stone-700" /><div className="mt-4 h-8 w-20 rounded bg-stone-200 dark:bg-stone-700" /><div className="mt-2 h-4 w-32 rounded bg-stone-200 dark:bg-stone-700" /></div>
              <div className="animate-pulse rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-800"><div className="h-12 w-12 rounded-xl bg-stone-200 dark:bg-stone-700" /><div className="mt-4 h-8 w-20 rounded bg-stone-200 dark:bg-stone-700" /><div className="mt-2 h-4 w-32 rounded bg-stone-200 dark:bg-stone-700" /></div>
              <div className="animate-pulse rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-800"><div className="h-12 w-12 rounded-xl bg-stone-200 dark:bg-stone-700" /><div className="mt-4 h-8 w-20 rounded bg-stone-200 dark:bg-stone-700" /><div className="mt-2 h-4 w-32 rounded bg-stone-200 dark:bg-stone-700" /></div>
              <div className="animate-pulse rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-800"><div className="h-12 w-12 rounded-xl bg-stone-200 dark:bg-stone-700" /><div className="mt-4 h-8 w-20 rounded bg-stone-200 dark:bg-stone-700" /><div className="mt-2 h-4 w-32 rounded bg-stone-200 dark:bg-stone-700" /></div>
            </>
          ) : stats ? (
            <>
              <StatCard
                icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                label="Total Staff"
                value={stats.total}
              />
              <StatCard
                icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M4.8 9.3A5 5 0 0112 4a5 5 0 017.2 5.3 4 4 0 01.5 7.2L12 20l-7.7-3.5a4 4 0 01.5-7.2z" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                label="Veterinarians"
                value={stats.veterinarians}
                className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30"
              />
              <StatCard
                icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                label="Receptionists"
                value={stats.receptionists}
                className="border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/30"
              />
              <StatCard
                icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                label="Licenses Expiring Soon"
                value={stats.licenses_expiring_soon}
                className={stats.licenses_expiring_soon > 0 ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30' : ''}
              />
            </>
          ) : null}
        </div>

        {/* Tabs + Filters */}
        <Card padding="md">
          <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-lg bg-stone-100 p-1 dark:bg-stone-800">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setPage(1) }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  tab === t.key
                    ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-stone-100'
                    : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1) }}
              className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:focus:border-amber-500 dark:focus:ring-amber-900/40"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending Setup</option>
              <option value="DEACTIVATED">Deactivated</option>
            </select>

            <div className="relative">
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search staff…"
                aria-label="Search staff"
                className="w-56 rounded-md border border-stone-200 bg-white px-4 py-2.5 pl-9 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-amber-500 dark:focus:ring-amber-900/40"
              />
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
            </div>
          </div>
        </div>
        </Card>

        {/* Content */}
        <div className="overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <svg
              className="mx-auto h-12 w-12 text-stone-300 dark:text-stone-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-stone-600 dark:text-stone-400">Failed to load staff</h3>
            <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
              {error instanceof Error && error.message.includes('permission')
                ? 'You do not have permission to view staff. Only Clinic Admins can manage staff.'
                : error instanceof Error && error.message.includes('change your password')
                  ? 'Please change your password before accessing this page.'
                  : error instanceof Error ? error.message : 'Failed to load staff. Please try again.'}
            </p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mt-4"
              loading={isFetching}
              onClick={() => refetch()}
            >
              Try again
            </Button>
          </div>
        ) : !data || data.results.length === 0 ? (
          <div className="py-16 text-center">
            <svg
              className="mx-auto h-12 w-12 text-stone-300 dark:text-stone-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-stone-600 dark:text-stone-400">
              {search || statusFilter
                ? 'No staff match your filters'
                : tab === 'ALL' ? 'No staff members yet' : tab === 'VETERINARIAN' ? 'No veterinarians yet' : 'No receptionists yet'}
            </h3>
            <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
              {search || statusFilter
                ? 'Try adjusting your search or filters'
                : tab === 'ALL'
                  ? 'Click "Add Staff" to get started'
                  : `Click "Add Staff" to register a new ${tab === 'VETERINARIAN' ? 'veterinarian' : 'receptionist'}`}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50 text-stone-500 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-400">
                    <th className="px-5 py-4 font-semibold">Name</th>
                    <th className="px-5 py-4 font-semibold">Email</th>
                    <th className="px-5 py-4 font-semibold">Role</th>
                    <th className="px-5 py-4 font-semibold">Phone</th>
                    <th className="px-5 py-4 font-semibold">License</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                  {data.results.map((staff) => (
                    <tr
                      key={staff.id}
                      onClick={() => navigate(`/clinic/staff/${staff.id}`)}
                      className="cursor-pointer transition hover:bg-amber-50/50 dark:hover:bg-amber-900/10"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <AvatarCell staff={staff} />
                          <span className="text-sm font-semibold text-stone-900 transition hover:text-amber-700 dark:text-stone-100 dark:hover:text-amber-400">
                            {staff.first_name} {staff.last_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-stone-500 dark:text-stone-400">{staff.email}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
                            staff.role === 'VETERINARIAN'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          }`}
                        >
                          {staff.role === 'VETERINARIAN' ? '🩺' : '📋'} {staff.position}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-stone-500 dark:text-stone-400">
                        {formatPhone(staff.phone)}
                      </td>
                      <td className="px-5 py-4">
                        <LicenseCell staff={staff} />
                      </td>
                      <td className="px-5 py-4">
                        {staff.must_change_password ? (
                          <span className="inline-flex items-center whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            Pending Setup
                          </span>
                        ) : staff.is_active ? (
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <ActionsCell staff={staff} onEdit={setEditingStaff} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 px-5 py-4 dark:border-stone-700">
              <span className="text-sm text-stone-500 dark:text-stone-400">
                Showing {startItem}–{endItem} of {data.total} staff
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={page >= data.total_pages}
                  onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
        </div>

      <AddStaffModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <BulkUploadModal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} />
      {editingStaff && (
        <EditStaffModal
          staff={editingStaff}
          isOpen={!!editingStaff}
          onClose={() => setEditingStaff(null)}
        />
      )}
    </div>
  )
  }
