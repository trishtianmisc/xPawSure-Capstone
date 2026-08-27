import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStaff } from '../hooks/useStaff'
import { AddStaffModal } from '../components/AddStaffModal'
import { BulkUploadModal } from '../components/BulkUploadModal'
import { useDebounce } from '../../../hooks/useDebounce'
import type { StaffMember } from '../types/staff.types'

type Tab = 'ALL' | 'VETERINARIAN' | 'RECEPTIONIST'

const DAYS_SOON_THRESHOLD = 90

function LicenseCell({ staff }: { staff: StaffMember }) {
  if (!staff.license_number) {
    return <span className="text-stone-400 dark:text-stone-500">—</span>
  }

  const expiry = staff.license_expiration_date ? new Date(`${staff.license_expiration_date}T00:00:00`) : null
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let badge: { label: string; className: string } | null = null
  if (expiry) {
    if (expiry < today) {
      badge = {
        label: 'Expired',
        className: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      }
    } else {
      const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays <= DAYS_SOON_THRESHOLD) {
        badge = {
          label: 'Expires soon',
          className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        }
      }
    }
  }

  return (
    <div>
      <p className="font-medium text-stone-900 dark:text-stone-100">{staff.license_number}</p>
      <div className="mt-0.5 flex items-center gap-1.5">
        {expiry && (
          <span className="text-xs text-stone-400">
            {expiry.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        )}
        {badge && (
          <span className={`inline-flex items-center rounded-full px-1.5 py-px text-[10px] font-semibold ${badge.className}`}>
            {badge.label}
          </span>
        )}
      </div>
    </div>
  )
}

export function StaffListPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)

  const debouncedSearch = useDebounce(search, 300)
  const roleParam = tab === 'ALL' ? undefined : tab

  const { data, isLoading, error } = useStaff({
    role: roleParam,
    search: debouncedSearch || undefined,
    page,
    page_size: 10,
  })

  const tabs: { key: Tab; label: string }[] = [
    { key: 'ALL', label: 'All Staff' },
    { key: 'VETERINARIAN', label: 'Veterinarians' },
    { key: 'RECEPTIONIST', label: 'Receptionists' },
  ]

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <header className="border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <button
              onClick={() => navigate('/clinic/dashboard')}
              className="flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
              type="button"
            >
              <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            
            </button>
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
              Staff Management
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Manage veterinarians and receptionists
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="rounded-lg border border-amber-900 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-50 dark:border-amber-600 dark:text-amber-500 dark:hover:bg-amber-900/20"
            >
              Upload CSV
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-950"
            >
              + Add Staff
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-6 py-6">
        <div className="flex items-center justify-between">
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

          <div className="relative">
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search staff…"
              className="w-64 rounded-lg border border-stone-300 bg-white px-3 py-1.5 pl-8 text-sm text-stone-900 placeholder-stone-400 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            />
            <svg
              className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="rounded-lg bg-red-50 p-4 text-center text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
            {error instanceof Error ? error.message : 'Failed to load staff. Please try again.'}
          </div>
        ) : !data || data.results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-4 grid size-16 place-items-center rounded-full bg-stone-100 text-3xl dark:bg-stone-800">
              {tab === 'VETERINARIAN' ? '🩺' : tab === 'RECEPTIONIST' ? '📋' : '👥'}
            </div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              {tab === 'ALL' ? 'No staff members yet' : tab === 'VETERINARIAN' ? 'No veterinarians yet' : 'No receptionists yet'}
            </h3>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              {tab === 'ALL'
                ? 'Click "Add Staff" to get started'
                : `Click "Add Staff" to register a new ${tab === 'VETERINARIAN' ? 'veterinarian' : 'receptionist'}`}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800">
                    <th className="px-4 py-3 font-semibold text-stone-600 dark:text-stone-400">Name</th>
                    <th className="px-4 py-3 font-semibold text-stone-600 dark:text-stone-400">Email</th>
                    <th className="px-4 py-3 font-semibold text-stone-600 dark:text-stone-400">Role</th>
                    <th className="px-4 py-3 font-semibold text-stone-600 dark:text-stone-400">Phone</th>
                    <th className="px-4 py-3 font-semibold text-stone-600 dark:text-stone-400">License</th>
                    <th className="px-4 py-3 font-semibold text-stone-600 dark:text-stone-400">Status</th>
                    <th className="px-4 py-3 font-semibold text-stone-600 dark:text-stone-400">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((staff) => (
                    <tr
                      key={staff.id}
                      className="border-b border-stone-100 transition hover:bg-stone-50 last:border-0 dark:border-stone-800 dark:hover:bg-stone-800/50"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-stone-900 dark:text-stone-100">
                          {staff.first_name} {staff.last_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-500 dark:text-stone-400">{staff.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            staff.role === 'VETERINARIAN'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          }`}
                        >
                          {staff.role === 'VETERINARIAN' ? '🩺' : '📋'} {staff.position}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-500 dark:text-stone-400">
                        {staff.phone || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <LicenseCell staff={staff} />
                      </td>
                      <td className="px-4 py-3">
                        {staff.must_change_password ? (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
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
                      <td className="px-4 py-3 text-xs text-stone-400">
                        {new Date(staff.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.total_pages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Showing page {data.page} of {data.total_pages} ({data.total} total)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-40 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                    disabled={page >= data.total_pages}
                    className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-40 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <AddStaffModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <BulkUploadModal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} />
    </div>
  )
}
