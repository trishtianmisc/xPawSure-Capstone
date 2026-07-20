import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

import { Alert, Button, Card, Input, Textarea } from '../../../../components/ui'
import { useToast } from '../../../../components/ui/ToastContext'
import { DashboardLayout } from '../../dashboard/components/DashboardLayout'
import { clinicResolver, type CreateClinicFormValues } from '../schemas/clinic.schema'
import { clinicService } from '../services/clinic.service'

export function CreateClinicPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<CreateClinicFormValues>({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      license_number: '',
    },
    resolver: clinicResolver,
  })

  const onSubmit = async (data: CreateClinicFormValues) => {
    setServerError(null)

    try {
      const clinic = await clinicService.create(data)
      showToast(`"${clinic.name}" registered successfully`, 'success')
      setTimeout(() => navigate('/super-admin/clinics'), 1000)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong.')
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

        <form className="space-y-6" noValidate onSubmit={handleSubmit(onSubmit)}>
          <Card padding="lg">
            <h2 className="text-lg font-bold text-stone-900">Clinic Information</h2>
            <p className="mt-1 text-sm text-stone-500">
              Basic details about the veterinary clinic.
            </p>

            <div className="mt-6 space-y-5">
              <Input
                {...register('name')}
                error={errors.name?.message}
                label="Clinic name"
                placeholder="e.g. Happy Paws Veterinary Clinic"
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <Input
                  {...register('email')}
                  error={errors.email?.message}
                  label="Email address"
                  placeholder="clinic@example.com"
                  type="email"
                />
                <Input
                  {...register('phone')}
                  label="Phone number"
                  placeholder="+63 912 345 6789"
                  type="tel"
                />
              </div>

              <Textarea
                {...register('address')}
                label="Address"
                placeholder="123 Main Street, City, Province"
                rows={3}
              />

              <Input
                {...register('license_number')}
                label="License number"
                placeholder="e.g. LDN-2026-001"
              />
            </div>
          </Card>

          {serverError && (
            <Alert variant="error">{serverError}</Alert>
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
