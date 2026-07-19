import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Alert, Badge, Button, Card, Input, Modal, Textarea } from '../../../../components/ui'
import { useToast } from '../../../../components/ui/ToastContext'
import { DashboardLayout } from '../../dashboard/components/DashboardLayout'
import { clinicService } from '../services/clinic.service'
import type { ClinicResponse } from '../services/clinic.service'

const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED'] as const

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  ACTIVE: 'success',
  INACTIVE: 'warning',
  SUSPENDED: 'error',
  ARCHIVED: 'default',
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
      <dt className="text-sm font-medium text-stone-500">{label}</dt>
      <dd className="mt-1 text-sm text-stone-900 sm:col-span-2 sm:mt-0">{value}</dd>
    </div>
  )
}

export function ClinicDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [clinic, setClinic] = useState<ClinicResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    license_number: '',
  })

  const fetchClinic = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const result = await clinicService.getById(id)
      setClinic(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clinic.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchClinic()
  }, [fetchClinic])

  const handleStatusChange = async (newStatus: string) => {
    if (!clinic) return
    if (!window.confirm(`Change status of "${clinic.name}" to ${newStatus}?`)) return
    setStatusUpdating(true)
    setError(null)
    try {
      const updated = await clinicService.changeStatus(clinic.id, newStatus)
      setClinic(updated)
      showToast(`Status changed to ${newStatus}.`, 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status.')
    } finally {
      setStatusUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!clinic) return
    if (!window.confirm(`Delete "${clinic.name}"? This action cannot be undone.`)) return
    try {
      await clinicService.delete(clinic.id)
      showToast('Clinic deleted.', 'success')
      navigate('/super-admin/clinics', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete clinic.')
    }
  }

  const openEdit = () => {
    if (!clinic) return
    setEditForm({
      name: clinic.name,
      email: clinic.email,
      phone: clinic.phone,
      address: clinic.address,
      license_number: clinic.license_number,
    })
    setError(null)
    setEditOpen(true)
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleEditSave = async () => {
    if (!clinic) return
    setSaving(true)
    setError(null)
    try {
      const updated = await clinicService.update(clinic.id, editForm)
      setClinic(updated)
      setEditOpen(false)
      showToast('Clinic updated successfully.', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update clinic.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
        </div>
      </DashboardLayout>
    )
  }

  if (error && !clinic) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <Alert variant="error">{error}</Alert>
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
          <div className="rounded-2xl bg-gradient-to-br from-amber-900 to-amber-950 p-7 sm:p-9">
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

        {error && (
          <div className="mb-6">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card padding="lg">
              <h2 className="text-base font-semibold text-stone-900">Clinic Information</h2>
              <dl className="mt-6 divide-y divide-stone-100">
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
              <h2 className="text-base font-semibold text-stone-900">Timeline</h2>
              <dl className="mt-6 divide-y divide-stone-100">
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
              <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
                Status
              </h3>
              <p className="mt-1 text-xs text-stone-400">Change the clinic's current status.</p>
              <div className="mt-4 space-y-2">
                {STATUS_OPTIONS.map((option) => {
                  const isCurrent = clinic.status === option
                  return (
                    <button
                      key={option}
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                        isCurrent
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : 'border-transparent text-stone-600 hover:border-stone-200 hover:bg-stone-50'
                      }`}
                      disabled={statusUpdating || isCurrent}
                      type="button"
                      onClick={() => handleStatusChange(option)}
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
                        <span className="text-[11px] font-semibold uppercase text-amber-600">Current</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </Card>

            <Card padding="md">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
                Edit
              </h3>
              <p className="mt-1 text-xs text-stone-400">Modify clinic information.</p>
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
              <h3 className="text-sm font-semibold uppercase tracking-wider text-red-500">
                Danger Zone
              </h3>
              <p className="mt-1 text-xs text-stone-400">Irreversible action — proceed with caution.</p>
              <div className="mt-4">
                <Button
                  size="sm"
                  variant="danger"
                  onClick={handleDelete}
                >
                  Delete Clinic
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Clinic">
        <div className="space-y-4">
          <Input label="Clinic name" name="name" value={editForm.name} onChange={handleEditChange} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Email" name="email" type="email" value={editForm.email} onChange={handleEditChange} />
            <Input label="Phone" name="phone" type="tel" value={editForm.phone} onChange={handleEditChange} />
          </div>
          <Textarea label="Address" name="address" rows={3} value={editForm.address} onChange={handleEditChange} />
          <Input label="License number" name="license_number" value={editForm.license_number} onChange={handleEditChange} />
          {error && (
            <Alert variant="error">{error}</Alert>
          )}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleEditSave}>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
