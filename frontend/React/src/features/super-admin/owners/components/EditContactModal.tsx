import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Alert, Button, Input, Modal, Textarea } from '../../../../components/ui'
import { apiErrorMessage } from '../../../../utils/error'
import { useOwner, useUpdateOwnerContact } from '../hooks/useOwners'
import { updateOwnerContactSchema } from '../schemas/owner.schema'

import type { UpdateOwnerContactFormData } from '../schemas/owner.schema'

interface EditContactModalProps {
  ownerId: string | null
  open: boolean
  onClose: () => void
}

export function EditContactModal({ ownerId, open, onClose }: EditContactModalProps) {
  const { data: owner, isLoading } = useOwner(open ? ownerId : null)
  const updateMutation = useUpdateOwnerContact(ownerId ?? '')

  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<UpdateOwnerContactFormData>({ resolver: zodResolver(updateOwnerContactSchema) })

  useEffect(() => {
    if (owner) {
      reset({
        first_name: owner.first_name,
        last_name: owner.last_name,
        phone: owner.phone ?? '',
        address: owner.address ?? '',
      })
    }
  }, [owner, reset])

  function handleClose() {
    reset()
    updateMutation.reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Edit contact info">
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <div className="size-7 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
        </div>
      ) : (
        <form
          className="space-y-4"
          noValidate
          onSubmit={handleSubmit((data) => updateMutation.mutate(data))}
        >
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
          <Textarea
            {...register('address')}
            error={errors.address?.message}
            label="Address (optional)"
            rows={3}
          />

          {owner && (
            <p className="rounded-lg bg-stone-50 px-4 py-3 text-sm text-stone-500 dark:bg-stone-900 dark:text-stone-400">
              Email (<span className="font-medium">{owner.email}</span>) and the account role
              cannot be changed here.
            </p>
          )}

          {updateMutation.isSuccess && (
            <Alert variant="success">Contact info updated.</Alert>
          )}

          {updateMutation.isError && (
            <Alert variant="error">{apiErrorMessage(updateMutation.error)}</Alert>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button onClick={handleClose} variant="secondary" type="button">
              {updateMutation.isSuccess ? 'Close' : 'Cancel'}
            </Button>
            {!updateMutation.isSuccess && (
              <Button loading={updateMutation.isPending} type="submit">
                Save changes
              </Button>
            )}
          </div>
        </form>
      )}
    </Modal>
  )
}
