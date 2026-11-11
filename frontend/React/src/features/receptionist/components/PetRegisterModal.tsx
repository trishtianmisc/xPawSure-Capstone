import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Modal } from '../../../components/ui/Modal'
import { useToast } from '../../../components/ui/ToastContext'
import { useDebounce } from '../../../hooks/useDebounce'
import { apiErrorMessage } from '../../../utils/error'
import { useOwners } from '../hooks/useOwners'
import { useCreatePet } from '../hooks/usePets'
import {
  createPetSchema,
  type CreatePetForm,
} from '../schemas/receptionist.schema'
import type { Pet } from '../types/receptionist.types'

const INPUT_CLASSES =
  'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500'

interface PetRegisterModalProps {
  open: boolean
  onClose: () => void
  /** Pre-selects and locks the owner (quick-add from a page already scoped to one). */
  ownerId?: string
  /** Display label for the locked owner. */
  ownerLabel?: string
  onCreated?: (pet: Pet) => void
}

/**
 * Desk-side patient registration. Requires an owner that already exists in
 * the system — owners themselves register through the mobile app.
 */
export function PetRegisterModal({
  open,
  onClose,
  ownerId,
  ownerLabel,
  onCreated,
}: PetRegisterModalProps) {
  const { showToast } = useToast()
  const createPet = useCreatePet()
  const [ownerSearch, setOwnerSearch] = useState('')
  const debouncedOwnerSearch = useDebounce(ownerSearch, 300)
  const { data: ownersData } = useOwners(
    { search: debouncedOwnerSearch || undefined, page_size: 20 },
    { enabled: open && !ownerId },
  )

  const defaultValues: CreatePetForm = {
    owner_id: ownerId ?? '',
    pet_name: '',
    // Unset sentinel; zod's enum rejects '' so the user must pick a sex.
    pet_sex: undefined as unknown as CreatePetForm['pet_sex'],
    pet_birth_date: null,
    pet_weight: null,
    pet_color: null,
    pet_microchip_no: null,
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePetForm>({
    resolver: zodResolver(createPetSchema),
    defaultValues,
  })

  // Reset on the way out so the next open starts clean without an effect.
  function handleClose() {
    reset(defaultValues)
    setOwnerSearch('')
    createPet.reset()
    onClose()
  }

  function onSubmit(values: CreatePetForm) {
    // The locked-owner branch never renders the select, so force the prop in.
    createPet.mutate({ ...values, owner_id: ownerId ?? values.owner_id }, {
      onSuccess: (pet) => {
        showToast(`Patient ${pet.name} registered`)
        onCreated?.(pet)
        handleClose()
      },
    })
  }

  return (
    <Modal open={open} onClose={handleClose} title="Register patient">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {ownerId ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
              Owner
            </label>
            <p className="rounded-md bg-stone-100 px-3 py-2 text-sm text-stone-700 dark:bg-stone-800 dark:text-stone-300">
              {ownerLabel ?? 'Selected owner'}
            </p>
          </div>
        ) : (
          <div>
            <label
              htmlFor="pet-owner"
              className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Owner
            </label>
            <input
              id="pet-owner"
              type="text"
              placeholder="Search owners..."
              value={ownerSearch}
              onChange={(event) => setOwnerSearch(event.target.value)}
              className={INPUT_CLASSES}
            />
            <select
              className={`${INPUT_CLASSES} mt-2`}
              aria-label="Select owner"
              {...register('owner_id')}
            >
              <option value="">Select an owner</option>
              {ownersData?.results.map((owner) => (
                <option key={owner.own_id} value={owner.own_id}>
                  {owner.full_name} — {owner.email}
                </option>
              ))}
            </select>
            {ownersData && ownersData.results.length === 0 && (
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                No owners found. Owners register through the mobile app.
              </p>
            )}
            {errors.owner_id && (
              <p className="mt-1 text-xs text-red-500">{errors.owner_id.message}</p>
            )}
          </div>
        )}

        <div>
          <label
            htmlFor="pet-name"
            className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300"
          >
            Pet name
          </label>
          <input
            id="pet-name"
            type="text"
            placeholder="e.g. Rex"
            className={INPUT_CLASSES}
            {...register('pet_name')}
          />
          {errors.pet_name && (
            <p className="mt-1 text-xs text-red-500">{errors.pet_name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="pet-sex"
              className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Sex
            </label>
            <select id="pet-sex" className={INPUT_CLASSES} {...register('pet_sex')}>
              <option value="">Select sex</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
            {errors.pet_sex && (
              <p className="mt-1 text-xs text-red-500">{errors.pet_sex.message}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="pet-birth"
              className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Birth date
            </label>
            <input
              id="pet-birth"
              type="date"
              className={INPUT_CLASSES}
              {...register('pet_birth_date', { setValueAs: (v) => v || null })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="pet-weight"
              className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Weight (kg)
            </label>
            <input
              id="pet-weight"
              type="number"
              step="0.1"
              min="0"
              placeholder="Optional"
              className={INPUT_CLASSES}
              {...register('pet_weight', {
                setValueAs: (v) => (v === '' || v === null ? null : Number(v)),
              })}
            />
            {errors.pet_weight && (
              <p className="mt-1 text-xs text-red-500">Weight must be a positive number</p>
            )}
          </div>
          <div>
            <label
              htmlFor="pet-color"
              className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Color
            </label>
            <input
              id="pet-color"
              type="text"
              placeholder="Optional"
              className={INPUT_CLASSES}
              {...register('pet_color', { setValueAs: (v) => v || null })}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="pet-chip"
            className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300"
          >
            Microchip no.
          </label>
          <input
            id="pet-chip"
            type="text"
            placeholder="Optional"
            className={INPUT_CLASSES}
            {...register('pet_microchip_no', { setValueAs: (v) => v || null })}
          />
        </div>

        {createPet.error && (
          <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">
            {apiErrorMessage(createPet.error)}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createPet.isPending}
            className="rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:opacity-50"
          >
            {createPet.isPending ? 'Registering…' : 'Register patient'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
