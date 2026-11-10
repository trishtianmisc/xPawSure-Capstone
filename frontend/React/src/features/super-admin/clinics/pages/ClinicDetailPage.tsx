import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Alert, Badge, Button, Card, Input, Modal, Textarea } from '../../../../components/ui'
import { useToast } from '../../../../components/ui/ToastContext'
import { apiErrorMessage } from '../../../../utils/error'
import { DashboardLayout } from '../../dashboard/components/DashboardLayout'
import { clinicService } from '../services/clinic.service'
import { ClinicAdminsTab } from '../tabs/ClinicAdminsTab'
import { ClinicActivityTab } from '../tabs/ClinicActivityTab'
import { ClinicOverviewTab } from '../tabs/ClinicOverviewTab'
import { ClinicOwnersTab } from '../tabs/ClinicOwnersTab'
import { ClinicPetsTab } from '../tabs/ClinicPetsTab'
import { ClinicStaffTab } from '../tabs/ClinicStaffTab'

const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED'] as const

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'admins', label: 'Admins' },
  { key: 'staff', label: 'Staff' },
  { key: 'owners', label: 'Owners' },
  { key: 'pets', label: 'Pets' },
  { key: 'activity', label: 'Activity' },
] as const

type TabKey = (typeof TABS)[number]['key']

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  ACTIVE: 'success',
  INACTIVE: 'warning',
  SUSPENDED: 'error',
  ARCHIVED: 'default',
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
      <dt className="text-sm font-medium text-stone-500 dark:text-stone-400">{label}</dt>
      <dd className="mt-1 text-sm text-stone-900 dark:text-stone-100 sm:col-span-2 sm:mt-0">{value}</dd>
    </div>
  )
}

interface EditFormValues {
  name: string
  email: string
  phone: string
  address: string
  license_number: string
}

export function ClinicDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const [editOpen, setEditOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  const { data: clinic, isLoading, error } = useQuery({
    queryKey: ['clinic', id],
    queryFn: () => clinicService.getById(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  })

  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<EditFormValues>()

  const openEdit = useCallback(() => {
    if (!clinic) return
    reset({
      name: clinic.name,
      email: clinic.email,
      phone: clinic.phone,
      address: clinic.address,
      license_number: clinic.license_number,
    })
    setEditOpen(true)
  }, [clinic, reset])

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => clinicService.changeStatus(clinic!.id, newStatus),
    onSuccess: (updated) => {
      queryClient.setQueryData(['clinic', id], updated)
      showToast(`Status changed to ${updated.status}.`, 'success')
    },
    onError: (err) => {
      showToast(apiErrorMessage(err), 'error')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: EditFormValues) => clinicService.update(clinic!.id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['clinic', id], updated)
      setEditOpen(false)
      showToast('Clinic updated successfully.', 'success')
    },
    onError: (err) => {
      showToast(apiErrorMessage(err), 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => clinicService.delete(clinic!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinics'] })
      showToast('Clinic deleted.', 'success')
      navigate('/super-admin/clinics', { replace: true })
    },
    onError: (err) => {
      showToast(apiErrorMessage(err), 'error')
    },
  })

  const queryError = error ? apiErrorMessage(error) : null

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
        </div>
      </DashboardLayout>
    )
  }

  if (queryError && !clinic) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <Alert variant="error">{queryError}</Alert>
          </div>
          <Button onClick={() => navigate('/super-admin/clinics')} variant="secondary">
            ← Back to clinics
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  if (!clinic) return null

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="rounded-md bg-gradient-to-br from-amber-900 to-amber-950 p-7 sm:p-9">
            <div>
              <h1 className="truncate text-3xl font-bold tracking-tight text-white">
                {clinic.name}
              </h1>
              <div className="mt-2 flex items-center gap-3">
                <Badge variant={STATUS_VARIANTS[clinic.status] ?? 'default'}>
                  {clinic.status}
                </Badge>
                {clinic.license_number && (
                  <span className="text-sm text-amber-200/70">
                    License: {clinic.license_number}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {queryError && (
          <div className="mb-6">
            <Alert variant="error">{queryError}</Alert>
          </div>
        )}

        <div className="mb-6 border-b border-stone-200 dark:border-stone-700">
          <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Clinic sections">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  aria-current={isActive ? 'page' : undefined}
                  className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? 'border-amber-600 text-amber-700 dark:border-amber-400 dark:text-amber-300'
                      : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-700 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:text-stone-200'
                  }`}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="mb-6">
              <ClinicOverviewTab clinicId={clinic.id} />
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <Card padding="lg">
                  <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Clinic Information</h2>
                  <dl className="mt-6 divide-y divide-stone-100 dark:divide-stone-700">
                    <div className="py-4 sm:py-5">
                      <InfoRow label="Name" value={clinic.name} />
                    </div>
                    <div className="py-4 sm:py-5">
                      <InfoRow label="Email" value={clinic.email || '—'} />
                    </div>
                    <div className="py-4 sm:py-5">
                      <InfoRow label="Phone" value={clinic.phone || '—'} />
                    </div>
                    <div className="py-4 sm:py-5">
                      <InfoRow label="License number" value={clinic.license_number || '—'} />
                    </div>
                    <div className="py-4 sm:py-5">
                      <InfoRow label="Address" value={clinic.address || '—'} />
                    </div>
                  </dl>
                </Card>

                <Card padding="lg">
                  <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Timeline</h2>
                  <dl className="mt-6 divide-y divide-stone-100 dark:divide-stone-700">
                    <div className="py-4 sm:py-5">
                      <InfoRow
                        label="Created"
                        value={new Date(clinic.created_at).toLocaleString()}
                      />
                    </div>
                    <div className="py-4 sm:py-5">
                      <InfoRow
                        label="Last updated"
                        value={new Date(clinic.updated_at).toLocaleString()}
                      />
                    </div>
                  </dl>
                </Card>
              </div>

              <div className="space-y-6">
                <Card padding="md">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Status
                  </h3>
                  <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">Change the clinic's current status.</p>
                  <div className="mt-4 space-y-2">
                    {STATUS_OPTIONS.map((option) => {
                      const isCurrent = clinic.status === option
                      return (
                        <button
                          key={option}
                          className={`flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left text-sm font-medium transition ${
                            isCurrent
                              ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                              : 'border-transparent text-stone-600 hover:border-stone-200 hover:bg-stone-50 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:bg-stone-800'
                          }`}
                          disabled={statusMutation.isPending || isCurrent}
                          type="button"
                          onClick={() => {
                            if (!window.confirm(`Change status of "${clinic.name}" to ${option}?`)) return
                            statusMutation.mutate(option)
                          }}
                        >
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                              option === 'ACTIVE' ? 'bg-emerald-500' :
                              option === 'INACTIVE' ? 'bg-amber-500' :
                              option === 'SUSPENDED' ? 'bg-red-500' :
                              'bg-stone-400'
                            }`}
                          />
                          <span className="flex-1">{option.charAt(0) + option.slice(1).toLowerCase()}</span>
                          {isCurrent && (
                            <span className="text-[11px] font-semibold uppercase text-amber-600 dark:text-amber-400">Current</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </Card>

                <Card padding="md">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Edit
                  </h3>
                  <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">Modify clinic information.</p>
                  <div className="mt-4">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={openEdit}
                    >
                      Edit Clinic
                    </Button>
                  </div>
                </Card>

                <Card padding="md">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-red-500 dark:text-red-400">
                    Danger Zone
                  </h3>
                  <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">Irreversible action — proceed with caution.</p>
                  <div className="mt-4">
                    <Button
                      loading={deleteMutation.isPending}
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        if (!window.confirm(`Delete "${clinic.name}"? This action cannot be undone.`)) return
                        deleteMutation.mutate()
                      }}
                    >
                      Delete Clinic
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}

        {activeTab === 'admins' && (
          <ClinicAdminsTab clinicId={clinic.id} clinicName={clinic.name} />
        )}
        {activeTab === 'staff' && <ClinicStaffTab clinicId={clinic.id} />}
        {activeTab === 'owners' && <ClinicOwnersTab clinicId={clinic.id} />}
        {activeTab === 'pets' && <ClinicPetsTab clinicId={clinic.id} />}
        {activeTab === 'activity' && <ClinicActivityTab clinicId={clinic.id} />}
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Clinic">
        <form className="space-y-4" noValidate onSubmit={handleSubmit((data) => updateMutation.mutate(data))}>
          <Input
            {...register('name', { required: 'Clinic name is required.' })}
            error={errors.name?.message}
            label="Clinic name"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              {...register('email')}
              error={errors.email?.message}
              label="Email"
              type="email"
            />
            <Input
              {...register('phone')}
              error={errors.phone?.message}
              label="Phone"
              type="tel"
            />
          </div>
          <Textarea
            {...register('address')}
            error={errors.address?.message}
            label="Address"
            rows={3}
          />
          <Input
            {...register('license_number')}
            error={errors.license_number?.message}
            label="License number"
          />
          {updateMutation.isError && (
            <Alert variant="error">
              {apiErrorMessage(updateMutation.error)}
            </Alert>
          )}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button loading={updateMutation.isPending} type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
