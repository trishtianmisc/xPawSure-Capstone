import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Alert, Button, Input, Modal } from '../../../../components/ui'
import { apiErrorMessage } from '../../../../utils/error'
import { useCreateClinicAdmin } from '../hooks/useAdmins'
import { createAdminSchema } from '../schemas/admin.schema'

import type { CreateAdminFormData } from '../schemas/admin.schema'

interface CreateAdminModalProps {
  clinicId: string
  clinicName: string
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CreateAdminModal({ clinicId, clinicName, open, onClose, onSuccess }: CreateAdminModalProps) {
  const createMutation = useCreateClinicAdmin(clinicId)

  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<CreateAdminFormData>({ resolver: zodResolver(createAdminSchema) })

  function handleClose() {
    reset()
    createMutation.reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title={`Add Clinic Admin — ${clinicName}`}>
      <form
        className="space-y-4"
        noValidate
        onSubmit={handleSubmit((data) =>
          createMutation.mutate(data, {
            onSuccess: () => {
              reset()
              onSuccess?.()
            },
          }),
        )}
      >
        <Input
          {...register('email')}
          error={errors.email?.message}
          label="Email"
          type="email"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            {...register('first_name')}
            error={errors.first_name?.message}
            label="First name"
          />
          <Input
            {...register('last_name')}
            error={errors.last_name?.message}
            label="Last name"
          />
        </div>
        <Input
          {...register('phone')}
          error={errors.phone?.message}
          label="Phone (optional)"
          type="tel"
        />

        {createMutation.isSuccess && (
          <Alert variant="success">
            <p className="font-semibold">Admin created. Temporary password:</p>
            <p className="mt-1 font-mono text-sm">{createMutation.data.temp_password}</p>
            <p className="mt-2 text-sm">
              This password is also emailed to the clinic. Copy it now — it will not be shown again.
            </p>
          </Alert>
        )}

        {createMutation.isError && (
          <Alert variant="error">{apiErrorMessage(createMutation.error)}</Alert>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button onClick={handleClose} variant="secondary" type="button">
            {createMutation.isSuccess ? 'Close' : 'Cancel'}
          </Button>
          {!createMutation.isSuccess && (
            <Button loading={createMutation.isPending} type="submit">
              Create Admin
            </Button>
          )}
        </div>
      </form>
    </Modal>
  )
}
