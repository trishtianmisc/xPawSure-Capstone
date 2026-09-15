import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Alert, Badge, Button, Card, Input, Modal, Textarea } from '../../../components/ui'
import { profileSchema, type ProfileFormValues } from '../schemas/clinicProfile.schema'
import type { ClinicProfile } from '../types/clinicProfile.types'
import { LogoUpload } from './LogoUpload'

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  ACTIVE: 'success',
  INACTIVE: 'warning',
  SUSPENDED: 'error',
  ARCHIVED: 'default',
}

interface ClinicProfileCardProps {
  profile: ClinicProfile
  isUpdating: boolean
  isUploadingLogo: boolean
  onUpdate: (data: ProfileFormValues) => void
  onUploadLogo: (file: File) => void
}

export function ClinicProfileCard({
  profile,
  isUpdating,
  isUploadingLogo,
  onUpdate,
  onUploadLogo,
}: ClinicProfileCardProps) {
  const [editOpen, setEditOpen] = useState(false)

  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  })

  function openEdit() {
    reset({
      name: profile.name,
      email: profile.email ?? '',
      phone: profile.phone ?? '',
      address: profile.address ?? '',
    })
    setEditOpen(true)
  }

  return (
    <Card padding="lg">
      <div className="flex items-start justify-between">
        <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
          Clinic Information
        </h2>
        <Badge variant={STATUS_VARIANTS[profile.status] ?? 'default'}>
          {profile.status}
        </Badge>
      </div>

      <div className="mt-6">
        <LogoUpload
          currentLogoUrl={profile.logo_url}
          onUpload={onUploadLogo}
          isUploading={isUploadingLogo}
        />
      </div>

      <dl className="mt-6 divide-y divide-stone-100 dark:divide-stone-700">
        <div className="py-4 sm:py-5">
          <InfoRow label="Name" value={profile.name} />
        </div>
        <div className="py-4 sm:py-5">
          <InfoRow label="Email" value={profile.email || '—'} />
        </div>
        <div className="py-4 sm:py-5">
          <InfoRow label="Phone" value={profile.phone || '—'} />
        </div>
        <div className="py-4 sm:py-5">
          <InfoRow label="Address" value={profile.address || '—'} />
        </div>
        <div className="py-4 sm:py-5">
          <InfoRow
            label="License Number"
            value={profile.license_number || '—'}
            hint={!profile.license_number ? 'Not set. Only Super Admin can change once set.' : undefined}
          />
        </div>
      </dl>

      <div className="mt-6">
        <Button variant="secondary" size="sm" onClick={openEdit}>
          Edit Profile
        </Button>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Clinic Profile">
        <form className="space-y-4" noValidate onSubmit={handleSubmit((data) => {
          onUpdate(data)
          setEditOpen(false)
        })}>
          <Input
            {...register('name')}
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
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)} type="button">
              Cancel
            </Button>
            <Button loading={isUpdating} type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  )
}

function InfoRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
      <dt className="text-sm font-medium text-stone-500 dark:text-stone-400">{label}</dt>
      <dd className="mt-1 text-sm text-stone-900 dark:text-stone-100 sm:col-span-2 sm:mt-0">
        {value}
        {hint && (
          <span className="ml-2 text-xs text-stone-400 dark:text-stone-500">{hint}</span>
        )}
      </dd>
    </div>
  )
}
