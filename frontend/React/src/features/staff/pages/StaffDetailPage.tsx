import { useNavigate, useParams } from 'react-router-dom'
import { useStaffDetail } from '../hooks/useStaffDetail'
import { useStaffAction } from '../hooks/useStaffAction'
import { EditStaffModal } from '../components/EditStaffModal'
import { useToast } from '../../../components/ui/ToastContext'
import { Modal } from '../../../components/ui/Modal'
import { formatPhone } from '../../../utils/format'
import { useState } from 'react'
import type { StaffMember } from '../types/staff.types'

const DAYS_SOON_THRESHOLD = 90

function getInitials(first: string, last: string): string {
  return ((first?.[0] ?? '') + (last?.[0] ?? '')).toUpperCase()
}

type ConfirmAction = 'reset-password' | 'resend-welcome' | 'deactivate'

const CONFIRM_CONFIG: Record<ConfirmAction, { title: string; message: string; confirmLabel: string; confirmClassName: string }> = {
  'reset-password': {
    title: 'Reset Password',
    message: 'This will generate a new temporary password and send it to the staff member via email. They will be required to change it on next login.',
    confirmLabel: 'Reset Password',
    confirmClassName: 'rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-950 disabled:opacity-50',
  },
  'resend-welcome': {
    title: 'Resend Welcome Email',
    message: 'This will send a new welcome email with a temporary password to the staff member. Their current password will be invalidated.',
    confirmLabel: 'Resend Welcome',
    confirmClassName: 'rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-950 disabled:opacity-50',
  },
  'deactivate': {
    title: 'Deactivate Staff Member',
    message: 'This staff member will immediately lose access to the system. They will not be able to log in until reactivated. Are you sure you want to proceed?',
    confirmLabel: 'Deactivate',
    confirmClassName: 'rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50',
  },
}

export function StaffDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: staff, isLoading, error } = useStaffDetail(id)
  const actionMutation = useStaffAction()
  const { showToast } = useToast()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  if (isLoading) {
    return (
        <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">

          <div className="flex items-start gap-4">
            <div className="h-14 w-14 animate-pulse rounded-full bg-stone-200 dark:bg-stone-700" />
            <div className="flex-1 space-y-3">
              <div className="h-7 w-48 animate-pulse rounded bg-stone-200 dark:bg-stone-700" />
              <div className="h-5 w-24 animate-pulse rounded-full bg-stone-200 dark:bg-stone-700" />
              <div className="h-4 w-36 animate-pulse rounded bg-stone-200 dark:bg-stone-700" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-16 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-700" />
              <div className="h-9 w-28 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-700" />
              <div className="h-9 w-24 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-700" />
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
              <div className="h-5 w-32 animate-pulse rounded bg-stone-200 dark:bg-stone-700" />
              <div className="mt-4 space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i}>
                    <div className="h-3 w-16 animate-pulse rounded bg-stone-200 dark:bg-stone-700" />
                    <div className="mt-1 h-4 w-32 animate-pulse rounded bg-stone-200 dark:bg-stone-700" />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
              <div className="h-5 w-20 animate-pulse rounded bg-stone-200 dark:bg-stone-700" />
              <div className="mt-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i}>
                    <div className="h-3 w-20 animate-pulse rounded bg-stone-200 dark:bg-stone-700" />
                    <div className="mt-1 h-4 w-32 animate-pulse rounded bg-stone-200 dark:bg-stone-700" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
    )
  }

  if (error || !staff) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="text-center">
          <div className="mb-4 grid size-16 mx-auto place-items-center rounded-full bg-red-50 dark:bg-red-900/20">
            <svg className="size-8 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
            {error instanceof Error ? error.message : 'Staff member not found.'}
          </p>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            The staff member may have been removed or you do not have access.
          </p>
          <button
            onClick={() => navigate('/clinic/staff')}
            className="mt-4 rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-950"
          >
            Back to Staff
          </button>
        </div>
      </div>
    )
  }

  const expiry = staff.license_expiration_date ? new Date(`${staff.license_expiration_date}T00:00:00`) : null
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let licenseBadge: { label: string; className: string } | null = null
  if (expiry) {
    if (expiry < today) {
      licenseBadge = { label: 'Expired', className: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
    } else {
      const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays <= DAYS_SOON_THRESHOLD) {
        licenseBadge = { label: 'Expires soon', className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' }
      }
    }
  }

  const isPendingSetup = staff.must_change_password && staff.is_active
  // const isActive = staff.is_active && !staff.must_change_password

  const handleAction = async (action: string) => {
    setConfirmAction(null)
    try {
      const result = await actionMutation.mutateAsync({ id: staff.id, action })
      showToast(result.detail, 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Action failed.', 'error')
    }
  }

  const openConfirm = (action: ConfirmAction) => setConfirmAction(action)

  const avatarBg = staff.role === 'VETERINARIAN'
    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'

  return (
    <>
      <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        <button
          onClick={() => navigate('/clinic/staff')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 px-3 py-1.5 text-sm font-medium text-stone-200 transition hover:bg-stone-800"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
        </button>
        {/* Pending Setup Banner */}
        {isPendingSetup && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                <svg className="size-4 text-amber-700 dark:text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Pending Setup
                </p>
                <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                  This staff member hasn't completed their initial setup. They need to change their temporary password on first login.
                </p>
              </div>
              <button
                onClick={() => openConfirm('resend-welcome')}
                disabled={actionMutation.isPending}
                className="shrink-0 rounded-lg border border-amber-900 px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-900/30"
              >
                {actionMutation.isPending ? 'Sending...' : 'Resend Welcome'}
              </button>
            </div>
          </div>
        )}

        {/* Identity Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <span className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold ${avatarBg}`}>
              {getInitials(staff.first_name, staff.last_name)}
            </span>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
                {staff.first_name} {staff.last_name}
              </h1>
              <div className="mt-1.5 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${staff.role === 'VETERINARIAN'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                    }`}
                >
                  {staff.role === 'VETERINARIAN' ? '\uD83E\uDE7A' : '\uD83D\uDCCB'} {staff.position}
                </span>
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
              </div>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{staff.email}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsEditOpen(true)}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Edit
            </button>
            <button
              onClick={() => openConfirm('reset-password')}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Reset Password
            </button>
            {staff.is_active ? (
              <button
                onClick={() => openConfirm('deactivate')}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Deactivate
              </button>
            ) : (
              <button
                onClick={() => handleAction('activate')}
                className="rounded-lg border border-green-300 px-4 py-2 text-sm font-medium text-green-600 transition hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
              >
                Activate
              </button>
            )}
          </div>
        </div>

        {/* Activity Summary */}
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
          <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
            Activity Summary
          </h3>
          <div className="mt-4 grid grid-cols-3 gap-4">
            {/* TODO: Replace stubbed values with real data from API when staff-scoped activity endpoint is available */}
            <div className="rounded-xl bg-stone-50 p-4 text-center dark:bg-stone-800">
              <p className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">{'\u2014'}</p>
              <p className="mt-1 text-xs font-medium text-stone-500 dark:text-stone-400">Appointments This Month</p>
            </div>
            <div className="rounded-xl bg-stone-50 p-4 text-center dark:bg-stone-800">
              <p className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">{'\u2014'}</p>
              <p className="mt-1 text-xs font-medium text-stone-500 dark:text-stone-400">Patients Seen</p>
            </div>
            <div className="rounded-xl bg-stone-50 p-4 text-center dark:bg-stone-800">
              <p className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">{'\u2014'}</p>
              <p className="mt-1 text-xs font-medium text-stone-500 dark:text-stone-400">Screenings Reviewed</p>
            </div>
          </div>
        </section>

        {/* Field Cards */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Contact & Role Card */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Contact & Role
            </h3>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Role</p>
                <p className="mt-1 text-sm font-medium text-stone-900 dark:text-stone-100">{staff.position}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Email</p>
                <p className="mt-1 text-sm text-stone-900 dark:text-stone-100">{staff.email}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Phone</p>
                <p className="mt-1 text-sm text-stone-900 dark:text-stone-100">{formatPhone(staff.phone)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Clinic</p>
                <p className="mt-1 text-sm text-stone-900 dark:text-stone-100">{staff.clinic_name || '\u2014'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Created</p>
                <p className="mt-1 text-sm text-stone-900 dark:text-stone-100">
                  {new Date(staff.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              {staff.updated_at && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Last Updated</p>
                  <p className="mt-1 text-sm text-stone-900 dark:text-stone-100">
                    {new Date(staff.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Licensing Card (Veterinarians only) */}
          {staff.role === 'VETERINARIAN' && (
            <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Licensing
              </h3>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">License Number</p>
                  <p className="mt-1 text-sm text-stone-900 dark:text-stone-100">
                    {staff.license_number || '\u2014'}
                    {licenseBadge && (
                      <span className={`ml-2 inline-flex items-center rounded-full px-1.5 py-px text-[10px] font-semibold ${licenseBadge.className}`}>
                        {licenseBadge.label}
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">License Expiry</p>
                  <p className="mt-1 text-sm text-stone-900 dark:text-stone-100">
                    {expiry ? expiry.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '\u2014'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Status</p>
                  <p className="mt-1">
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
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Action History */}
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
          <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
            Action History
          </h3>
          {/* TODO: Replace stubbed list with real data from audit log API endpoint */}
          <div className="mt-4">
            <div className="flex items-start gap-3 pb-4 last:pb-0">
              <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-stone-100 dark:bg-stone-800">
                <svg className="size-3.5 text-stone-500 dark:text-stone-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-700 dark:text-stone-300">Account created</p>
                <p className="mt-0.5 text-xs text-stone-400 dark:text-stone-500">
                  {new Date(staff.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
            {staff.updated_at && staff.updated_at !== staff.created_at && (
              <div className="flex items-start gap-3 pb-4 last:pb-0">
                <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-stone-100 dark:bg-stone-800">
                  <svg className="size-3.5 text-stone-500 dark:text-stone-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-700 dark:text-stone-300">Profile updated</p>
                  <p className="mt-0.5 text-xs text-stone-400 dark:text-stone-500">
                    {new Date(staff.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
            )}
            {!staff.is_active && (
              <div className="flex items-start gap-3 pb-4 last:pb-0">
                <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <svg className="size-3.5 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-700 dark:text-stone-300">Account deactivated</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Edit Modal */}
      {isEditOpen && (
        <EditStaffModal
          staff={staff as StaffMember}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
        />
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <Modal
          open={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          title={CONFIRM_CONFIG[confirmAction].title}
        >
          <p className="text-sm text-stone-600 dark:text-stone-400">
            {CONFIRM_CONFIG[confirmAction].message}
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setConfirmAction(null)}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Cancel
            </button>
            <button
              onClick={() => handleAction(confirmAction)}
              disabled={actionMutation.isPending}
              className={CONFIRM_CONFIG[confirmAction].confirmClassName}
            >
              {actionMutation.isPending ? 'Processing...' : CONFIRM_CONFIG[confirmAction].confirmLabel}
            </button>
          </div>
        </Modal>
      )}
    </>
    )
}
