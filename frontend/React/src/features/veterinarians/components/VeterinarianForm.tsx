import { useForm } from 'react-hook-form'

import { Button, Input } from '../../../components/ui'
import { createVeterinarianResolver, type CreateVeterinarianFormValues } from '../schemas/veterinarian.schema'
import { useCreateVeterinarian } from '../hooks/useCreateVeterinarian'

interface VeterinarianFormProps {
  onClose: () => void
}

export function VeterinarianForm({ onClose }: VeterinarianFormProps) {
  const { createVeterinarian, isSubmitting } = useCreateVeterinarian(onClose)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateVeterinarianFormValues>({
    resolver: createVeterinarianResolver,
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      license_number: '',
      license_expiration_date: null,
    },
  })

  const onSubmit = async (data: CreateVeterinarianFormValues) => {
    try {
      await createVeterinarian({
        ...data,
        phone: data.phone || undefined,
        license_expiration_date: data.license_expiration_date || null,
      })
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const serverErrors = (error as { response: { data: Record<string, string[]> } }).response?.data
        if (serverErrors) {
          for (const [field, messages] of Object.entries(serverErrors)) {
            if (field in data) {
              setError(field as keyof CreateVeterinarianFormValues, {
                type: 'server',
                message: Array.isArray(messages) ? messages[0] : messages,
              })
            }
          }
        }
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Personal Information
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="First Name"
            placeholder="Enter first name"
            error={errors.first_name?.message}
            {...register('first_name')}
          />
          <Input
            label="Last Name"
            placeholder="Enter last name"
            error={errors.last_name?.message}
            {...register('last_name')}
          />
        </div>
        <div className="mt-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="vet@clinic.com"
            error={errors.email?.message}
            {...register('email')}
          />
        </div>
        <div className="mt-4">
          <Input
            label="Phone Number"
            type="tel"
            placeholder="Optional"
            error={errors.phone?.message}
            {...register('phone')}
          />
        </div>
      </div>

      <hr className="border-stone-200 dark:border-stone-700" />

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Professional Information
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="PRC License Number"
            placeholder="Enter license number"
            error={errors.license_number?.message}
            {...register('license_number')}
          />
          <Input
            label="License Expiration Date"
            type="date"
            error={errors.license_expiration_date?.message}
            {...register('license_expiration_date')}
          />
        </div>
      </div>

      <hr className="border-stone-200 dark:border-stone-700" />

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Account Information
        </h3>
        <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
          A temporary password will be auto-generated. The veterinarian will be required to change it on first login.
        </p>
      </div>

      <div className="flex justify-end gap-3 border-t border-stone-200 pt-5 dark:border-stone-700">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Create Veterinarian
        </Button>
      </div>
    </form>
  )
}
