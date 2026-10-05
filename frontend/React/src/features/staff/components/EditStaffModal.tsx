import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useUpdateStaff } from '../hooks/useUpdateStaff'
import { useToast } from '../../../components/ui/ToastContext'
import { editStaffSchema, type EditStaffFormData } from '../schemas/staff.schema'
import { normalizePhoneInput } from '../../../utils/format'
import type { StaffMember } from '../types/staff.types'

interface EditStaffModalProps {
  staff: StaffMember
  isOpen: boolean
  onClose: () => void
}

export function EditStaffModal({ staff, isOpen, onClose }: EditStaffModalProps) {
  const updateMutation = useUpdateStaff()
  const { showToast } = useToast()
  const isVet = staff.role === 'VETERINARIAN'

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<EditStaffFormData>({
    resolver: zodResolver(editStaffSchema(staff.role)),
    defaultValues: {
      first_name: staff.first_name,
      last_name: staff.last_name,
      phone: staff.phone || '',
      license_number: staff.license_number || '',
      license_expiration_date: staff.license_expiration_date || '',
    },
  })

  useEffect(() => {
    if (isOpen) {
      reset({
        first_name: staff.first_name,
        last_name: staff.last_name,
        phone: staff.phone || '',
        license_number: staff.license_number || '',
        license_expiration_date: staff.license_expiration_date || '',
      })
    }
  }, [isOpen, staff, reset])

  if (!isOpen) return null

  const onSubmit = async (data: EditStaffFormData) => {
    try {
      await updateMutation.mutateAsync({
        id: staff.id,
        payload: {
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone || '',
          license_number: isVet ? data.license_number : undefined,
          license_expiration_date: isVet ? data.license_expiration_date : undefined,
        },
      })
      showToast('Staff member updated successfully', 'success')
      onClose()
    } catch(error) {
      showToast( error instanceof Error ? error.message : 'Failed to update staff member', 'error')
      // error handled by mutation
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-lg rounded-2xl bg-white shadow-xl dark:bg-stone-900">
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 dark:border-stone-700">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
            Edit Staff Member
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="space-y-4">
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Editing <span className="font-semibold text-stone-900 dark:text-stone-100">{staff.email}</span>
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('first_name')}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                />
                {errors.first_name && (
                  <p className="mt-1 text-xs text-red-600">{errors.first_name.message}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('last_name')}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                />
                {errors.last_name && (
                  <p className="mt-1 text-xs text-red-600">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Phone</label>
              <input
                {...register('phone')}
                onChange={(e) => {
                  const raw = e.target.value
                  e.target.value = normalizePhoneInput(raw)
                  register('phone').onChange(e)
                }}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                placeholder="0917 123 4567"
                maxLength={11}
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
              )}
            </div>

            {isVet && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
                    License Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('license_number')}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                  />
                  {errors.license_number && (
                    <p className="mt-1 text-xs text-red-600">{errors.license_number.message}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
                    License Expiry <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    {...register('license_expiration_date')}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                  />
                  {errors.license_expiration_date && (
                    <p className="mt-1 text-xs text-red-600">{errors.license_expiration_date.message}</p>
                  )}
                </div>
              </>
            )}
          </div>

          {updateMutation.isError && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {updateMutation.error.message}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || updateMutation.isPending}
              className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-950 disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
