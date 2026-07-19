import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Alert, Button, Card, Input, Textarea } from '../../../../components/ui'
import { useToast } from '../../../../components/ui/ToastContext'
import { DashboardLayout } from '../../dashboard/components/DashboardLayout'
import { clinicService } from '../services/clinic.service'

export function CreateClinicPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    license_number: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.email.trim()) {
      setError('Email address is required — the clinic admin account credentials will be sent there.')
      return
    }

    setIsSubmitting(true)

    try {
      const clinic = await clinicService.create(form)
      showToast(`"${clinic.name}" registered successfully`, 'success')
      setTimeout(() => navigate('/super-admin/clinics'), 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="rounded-2xl bg-gradient-to-br from-amber-900 to-amber-950 p-7 sm:p-9">
            <button
              className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-amber-200/80 transition hover:text-white"
              onClick={() => navigate('/super-admin/dashboard')}
              type="button"
            >
              <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to dashboard
            </button>
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Register New Clinic
            </h1>
            <p className="mt-2 max-w-xl text-base text-amber-200/80">
              Fill in the details below to onboard a new veterinary clinic.
            </p>
          </div>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <Card padding="lg">
            <h2 className="text-lg font-bold text-stone-900">Clinic Information</h2>
            <p className="mt-1 text-sm text-stone-500">
              Basic details about the veterinary clinic.
            </p>

            <div className="mt-6 space-y-5">
              <Input
                label="Clinic name"
                name="name"
                onChange={handleChange}
                placeholder="e.g. Happy Paws Veterinary Clinic"
                required
                value={form.name}
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <Input
                  label="Email address"
                  name="email"
                  onChange={handleChange}
                  placeholder="clinic@example.com"
                  required
                  type="email"
                  value={form.email}
                />
                <Input
                  label="Phone number"
                  name="phone"
                  onChange={handleChange}
                  placeholder="+63 912 345 6789"
                  type="tel"
                  value={form.phone}
                />
              </div>

              <Textarea
                label="Address"
                name="address"
                onChange={handleChange}
                placeholder="123 Main Street, City, Province"
                rows={3}
                value={form.address}
              />

              <Input
                label="License number"
                name="license_number"
                onChange={handleChange}
                placeholder="e.g. LDN-2026-001"
                value={form.license_number}
              />
            </div>
          </Card>

          {error && (
            <Alert variant="error">{error}</Alert>
          )}

          <div className="flex items-center gap-3">
            <Button loading={isSubmitting} size="lg" type="submit">
              Register Clinic
            </Button>
            <Button
              onClick={() => navigate('/super-admin/dashboard')}
              type="button"
              variant="secondary"
              size="lg"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
