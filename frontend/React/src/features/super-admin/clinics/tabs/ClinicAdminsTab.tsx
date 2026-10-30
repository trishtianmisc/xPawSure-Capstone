import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Badge, Button } from '../../../../components/ui'
import { useToast } from '../../../../components/ui/ToastContext'
import { apiErrorMessage } from '../../../../utils/error'
import { CreateAdminModal } from '../../admins/components/CreateAdminModal'
import { useAdminAction } from '../../admins/hooks/useAdmins'
import { adminService } from '../../admins/services/admin.service'

import type { ClinicAdmin } from '../../admins/types/admin.types'

function statusOf(admin: ClinicAdmin): string {
  if (!admin.is_active) return 'DEACTIVATED'
  if (admin.must_change_password) return 'PENDING'
  return 'ACTIVE'
}

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  ACTIVE: 'success',
  DEACTIVATED: 'error',
  PENDING: 'warning',
}

export function ClinicAdminsTab({ clinicId, clinicName }: { clinicId: string; clinicName: string }) {
  const { showToast } = useToast()
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['super-admin-clinic-admins', clinicId],
    queryFn: () => adminService.listForClinic(clinicId),
    staleTime: 30_000,
  })

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
        onSuccess: () =>
          showToast(
            action === 'resend-credentials'
              ? 'Temporary credentials sent.'
              : action === 'deactivate'
                ? 'Account deactivated.'
                : 'Account activated.',
            'success',
          ),
        onError: (err) => showToast(apiErrorMessage(err), 'error'),
      },
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Clinic Admin accounts for {clinicName}. Super Admins can add admins, resend credentials, and deactivate accounts.
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)} type="button">
          + Add Admin
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
          </div>
        ) : !data || data.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-stone-400 dark:text-stone-500">No Clinic Admin accounts for this clinic.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50 text-stone-500 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-400">
                  <th className="px-5 py-4 font-semibold">Name</th>
                  <th className="px-5 py-4 font-semibold">Email</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Last login</th>
                  <th className="px-5 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                {data.map((admin) => {
                  const status = statusOf(admin)
                  return (
                    <tr key={admin.id} className="transition hover:bg-amber-50/50 dark:hover:bg-amber-900/10">
                      <td className="px-5 py-4 font-medium text-stone-900 dark:text-stone-100">
                        {admin.first_name} {admin.last_name}
                      </td>
                      <td className="px-5 py-4 text-stone-500 dark:text-stone-400">{admin.email}</td>
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
      </div>

      <CreateAdminModal
        clinicId={clinicId}
        clinicName={clinicName}
        onClose={() => setCreateOpen(false)}
        open={createOpen}
      />
    </div>
  )
}
