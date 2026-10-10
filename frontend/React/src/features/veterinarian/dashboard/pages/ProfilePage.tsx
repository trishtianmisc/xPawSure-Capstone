import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { useAuth } from '../../../auth/context/AuthContext'

const profileSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().max(20).optional().or(z.literal('')),
})

type ProfileForm = z.infer<typeof profileSchema>

const positionLabel: Record<string, string> = {
  CLINIC_ADMIN: 'Clinic Admin',
  VETERINARIAN: 'Veterinarian',
  RECEPTIONIST: 'Receptionist',
}

function displayValue(value: string | null | undefined): string {
  return value && value.trim() ? value : 'Not set'
}

export function ProfilePage() {
  const { user, getProfile, updateProfile } = useAuth()
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    if (user && user.license_number === undefined) {
      void getProfile().catch(() => undefined)
    }
  }, [user, getProfile])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name ?? '',
      last_name: user?.last_name ?? '',
      phone: user?.phone ?? '',
    },
  })

  useEffect(() => {
    if (user) {
      reset({
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone ?? '',
      })
    }
  }, [user, reset])

  async function onSubmit(data: ProfileForm) {
    setSuccess(false)
    setServerError(null)
    try {
      await updateProfile({
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone || undefined,
      })
      setSuccess(true)
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to update profile'
      setServerError(msg)
    }
  }

  const readOnlyInputClass =
    'w-full rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-500 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-400'
  const editableInputClass =
    'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100'

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <h2 className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">My Profile</h2>

      {/* Identity card */}
      <div className="flex items-center gap-4 rounded-md border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-800">
        <div className="grid size-20 shrink-0 place-items-center rounded-md bg-stone-200 text-xl font-bold text-stone-600 dark:bg-stone-700 dark:text-stone-300">
          {user?.first_name?.[0]}
          {user?.last_name?.[0]}
        </div>
        <div>
          <p className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            {user?.first_name} {user?.last_name}
          </p>
          <p className="text-sm text-stone-500 dark:text-stone-400">{user?.email}</p>
          <span className="mt-1 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            {positionLabel[user?.position ?? ''] ?? positionLabel[user?.role ?? ''] ?? user?.role}
          </span>
        </div>
      </div>

      {/* Profile form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-md border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-800"
      >
        <h3 className="mb-4 text-xl font-extrabold text-stone-900 dark:text-stone-100">
          Profile Information
        </h3>

        {success && (
          <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-800 dark:bg-green-900/20 dark:text-green-300">
            Profile updated successfully.
          </div>
        )}
        {serverError && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:bg-red-900/20 dark:text-red-300">
            {serverError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register('first_name')}
              className={`${editableInputClass} ${
                errors.first_name ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''
              }`}
            />
            {errors.first_name && (
              <p className="mt-1 text-xs text-red-500">{errors.first_name.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register('last_name')}
              className={`${editableInputClass} ${
                errors.last_name ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''
              }`}
            />
            {errors.last_name && (
              <p className="mt-1 text-xs text-red-500">{errors.last_name.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">
              Phone Number
            </label>
            <input
              {...register('phone')}
              placeholder="09XX XXX XXXX"
              className={`${editableInputClass} ${
                errors.phone ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''
              }`}
            />
            {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">
              Email Address
            </label>
            <input type="email" disabled readOnly value={user?.email ?? ''} className={readOnlyInputClass} />
            <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
              Contact a clinic admin to change your email.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">
              Associated Clinic
            </label>
            <input disabled readOnly value={displayValue(user?.clinic_name)} className={readOnlyInputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">
              Position
            </label>
            <input
              disabled
              readOnly
              value={
                positionLabel[user?.position ?? ''] ??
                positionLabel[user?.role ?? ''] ??
                displayValue(user?.position ?? user?.role)
              }
              className={readOnlyInputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">
              License Number
            </label>
            <input disabled readOnly value={displayValue(user?.license_number)} className={readOnlyInputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">
              License Expiration Date
            </label>
            <input
              disabled
              readOnly
              value={displayValue(user?.license_expiration_date)}
              className={readOnlyInputClass}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => reset()}
            disabled={!isDirty}
            className="rounded-md border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-600 dark:text-stone-400 dark:hover:bg-stone-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="rounded-md bg-amber-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>

      {/* Password card */}
      <div className="rounded-md border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Password</p>
            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
              Change your account password
            </p>
          </div>
          <Link
            to="/change-password"
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 dark:border-stone-600 dark:text-stone-400 dark:hover:bg-stone-700"
          >
            Change password
          </Link>
        </div>
      </div>
    </div>
  )
}
