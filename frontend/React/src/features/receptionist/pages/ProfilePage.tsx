import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { useAuth } from '../../auth/context/AuthContext'

const profileSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().max(20).optional().or(z.literal('')),
})

type ProfileForm = z.infer<typeof profileSchema>

export function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

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

  const roleLabel: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    CLINIC_ADMIN: 'Clinic Admin',
    VETERINARIAN: 'Veterinarian',
    RECEPTIONIST: 'Receptionist',
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
          My Profile
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Manage your personal information
        </p>
      </div>

      {/* Avatar card */}
      <div className="mb-6 flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="grid size-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-2xl font-bold text-white shadow-sm">
          {user?.first_name?.[0]}
          {user?.last_name?.[0]}
        </div>
        <div>
          <p className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            {user?.first_name} {user?.last_name}
          </p>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {user?.email}
          </p>
          <span className="mt-1 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            {roleLabel[user?.role ?? ''] ?? user?.role}
          </span>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5 rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900"
      >
        {success && (
          <div className="rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-800 dark:bg-green-900/20 dark:text-green-300">
            Profile updated successfully.
          </div>
        )}
        {serverError && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:bg-red-900/20 dark:text-red-300">
            {serverError}
          </div>
        )}

        {/* Read-only: Email */}
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
            Email
          </label>
          <input
            type="email"
            disabled
            value={user?.email ?? ''}
            className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
          />
          <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
            Contact a clinic admin to change your email.
          </p>
        </div>

        {/* First name */}
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
            First name <span className="text-red-500">*</span>
          </label>
          <input
            {...register('first_name')}
            className={`w-full rounded-lg border px-3 py-2.5 text-sm text-stone-900 dark:text-stone-100 ${
              errors.first_name
                ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                : 'border-stone-300 focus:border-amber-500 focus:ring-amber-500/20 dark:border-stone-600'
            } focus:outline-none focus:ring-2`}
          />
          {errors.first_name && (
            <p className="mt-1 text-xs text-red-500">{errors.first_name.message}</p>
          )}
        </div>

        {/* Last name */}
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
            Last name <span className="text-red-500">*</span>
          </label>
          <input
            {...register('last_name')}
            className={`w-full rounded-lg border px-3 py-2.5 text-sm text-stone-900 dark:text-stone-100 ${
              errors.last_name
                ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                : 'border-stone-300 focus:border-amber-500 focus:ring-amber-500/20 dark:border-stone-600'
            } focus:outline-none focus:ring-2`}
          />
          {errors.last_name && (
            <p className="mt-1 text-xs text-red-500">{errors.last_name.message}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
            Phone
          </label>
          <input
            {...register('phone')}
            placeholder="09XX XXX XXXX"
            className={`w-full rounded-lg border px-3 py-2.5 text-sm text-stone-900 dark:text-stone-100 ${
              errors.phone
                ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                : 'border-stone-300 focus:border-amber-500 focus:ring-amber-500/20 dark:border-stone-600'
            } focus:outline-none focus:ring-2`}
          />
          {errors.phone && (
            <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={() => reset()}
            disabled={!isDirty}
            className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-600 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Change password link */}
      <div className="mt-6 rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Password
            </p>
            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
              Change your account password
            </p>
          </div>
          <Link
            to="/change-password"
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 dark:border-stone-600 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            Change password
          </Link>
        </div>
      </div>
    </div>
  )
}
