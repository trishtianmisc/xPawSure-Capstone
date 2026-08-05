import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { CreateStaffPayload } from '../types/staff.types'
import { createVeterinarianSchema, createReceptionistSchema } from '../schemas/staff.schema'
import type { z } from 'zod'

type StaffRole = 'VETERINARIAN' | 'RECEPTIONIST'

interface StaffFormProps {
  role: StaffRole | null
  onSubmit: (data: CreateStaffPayload) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
  serverError: string | null
}

function RequiredMark() {
  return <span className="text-red-500"> *</span>
}

export function StaffForm({ role, onSubmit, onCancel, isSubmitting, serverError }: StaffFormProps) {
  const schema = role === 'VETERINARIAN' ? createVeterinarianSchema : createReceptionistSchema
  type FormData = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: role as FormData['role'] },
  })

  if (!role) return null

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data as CreateStaffPayload))} className="space-y-4">
      {serverError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            First Name<RequiredMark />
          </label>
          <input
            {...register('first_name')}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            placeholder="John"
          />
          {errors.first_name && (
            <p className="mt-1 text-xs text-red-600">{errors.first_name.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Last Name<RequiredMark />
          </label>
          <input
            {...register('last_name')}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            placeholder="Doe"
          />
          {errors.last_name && (
            <p className="mt-1 text-xs text-red-600">{errors.last_name.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Email<RequiredMark />
        </label>
        <input
          {...register('email')}
          type="email"
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          placeholder="staff@clinic.com"
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Phone <span className="font-normal normal-case text-stone-400">(optional)</span>
        </label>
        <input
          {...register('phone')}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          placeholder="+63 912 345 6789"
        />
      </div>

      {role === 'VETERINARIAN' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                License Number<RequiredMark />
              </label>
              <input
                {...register('license_number')}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                placeholder="LIC-001"
              />
              {errors.license_number && (
                <p className="mt-1 text-xs text-red-600">{errors.license_number.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                License Expiration Date<RequiredMark />
              </label>
              <input
                {...register('license_expiration_date')}
                type="date"
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              />
              {errors.license_expiration_date && (
                <p className="mt-1 text-xs text-red-600">{errors.license_expiration_date.message}</p>
              )}
            </div>
          </div>
        </>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-950 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating…' : `Create ${role === 'VETERINARIAN' ? 'Veterinarian' : 'Receptionist'}`}
        </button>
      </div>
    </form>
  )
}
