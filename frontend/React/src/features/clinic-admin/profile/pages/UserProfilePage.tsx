import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Modal } from '../../../../components/ui/Modal'
import { useAuth } from '../../../auth/context/AuthContext'
import { apiErrorMessage } from '../../../../utils/error'
import { PageHero } from '../../../receptionist/components/PageHero'

const profileSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  phone: z
    .string()
    .max(20)
    .regex(/^(09\d{9}|\+63\d{10})?$/, 'Phone must be 09XXXXXXXXX or +63XXXXXXXXXX.')
    .optional()
    .or(z.literal('')),
})

type ProfileForm = z.infer<typeof profileSchema>

const ACCEPTED_PICTURE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PICTURE_BYTES = 2 * 1024 * 1024

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  CLINIC_ADMIN: 'Clinic Admin',
  VETERINARIAN: 'Veterinarian',
  RECEPTIONIST: 'Receptionist',
}

function displayValue(value: string | null | undefined): string {
  return value && value.trim() ? value : 'Not set'
}

export function UserProfilePage() {
  const { user, getProfile, updateProfile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [pictureSelection, setPictureSelection] = useState<{
    file: File
    previewUrl: string
  } | null>(null)
  const [pictureError, setPictureError] = useState<string | null>(null)
  const [pendingSave, setPendingSave] = useState<ProfileForm | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pictureFile = pictureSelection?.file ?? null
  const picturePreview = pictureSelection?.previewUrl ?? null

  useEffect(() => {
    if (user && user.profile_picture === undefined) {
      void getProfile().catch(() => undefined)
    }
  }, [user, getProfile])

  useEffect(() => {
    if (!pictureSelection) return
    return () => URL.revokeObjectURL(pictureSelection.previewUrl)
  }, [pictureSelection])

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

  function handlePictureChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setSuccess(false)
    setServerError(null)

    if (!ACCEPTED_PICTURE_TYPES.includes(file.type)) {
      setPictureSelection(null)
      setPictureError('Profile picture must be a JPEG, PNG, or WebP image.')
      return
    }

    if (file.size > MAX_PICTURE_BYTES) {
      setPictureSelection(null)
      setPictureError('Profile picture must be 2 MB or less.')
      return
    }

    setPictureSelection({
      file,
      previewUrl: URL.createObjectURL(file),
    })
    setPictureError(null)
  }

  function startEditing() {
    setSuccess(false)
    setServerError(null)
    setPictureError(null)
    setIsEditing(true)
  }

  function cancelEditing() {
    reset()
    setPictureSelection(null)
    setPictureError(null)
    setServerError(null)
    setIsEditing(false)
  }

  function requestSave(data: ProfileForm) {
    if (!isEditing) return

    setSuccess(false)
    setServerError(null)
    setPendingSave(data)
  }

  function closeConfirmation() {
    if (!isSaving) setPendingSave(null)
  }

  async function confirmSave() {
    if (!pendingSave || isSaving) return

    setIsSaving(true)
    setSuccess(false)
    setServerError(null)
    try {
      await updateProfile({
        first_name: pendingSave.first_name,
        last_name: pendingSave.last_name,
        phone: pendingSave.phone,
        ...(pictureFile ? { profile_picture: pictureFile } : {}),
      })
      reset({
        first_name: pendingSave.first_name,
        last_name: pendingSave.last_name,
        phone: pendingSave.phone ?? '',
      })
      setPictureSelection(null)
      setPendingSave(null)
      setIsEditing(false)
      setSuccess(true)
    } catch (err: unknown) {
      setServerError(apiErrorMessage(err))
      setPendingSave(null)
    } finally {
      setIsSaving(false)
    }
  }

  const readOnlyInputClass =
    'w-full rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-500 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-400'
  const editableInputClass =
    'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100'
  const editableFieldClass = isEditing ? editableInputClass : readOnlyInputClass
  const avatarSource = picturePreview || user?.profile_picture
  const avatarInitials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase() || '?'
  const position = roleLabel[user?.position ?? ''] ?? roleLabel[user?.role ?? ''] ?? user?.role

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <PageHero
          title={`${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || 'My Profile'}
          subtitle={user?.email ?? ''}
          avatar={
            <div className="relative shrink-0">
              {avatarSource ? (
                <img
                  src={avatarSource}
                  alt="Profile picture"
                  className="size-20 rounded-2xl object-cover ring-2 ring-white/20 sm:size-24"
                />
              ) : (
                <span className="inline-flex size-20 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold text-white ring-2 ring-white/20 sm:size-24">
                  {avatarInitials}
                </span>
              )}
              {isEditing && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Update profile picture"
                    title="Update profile picture"
                    className="absolute -bottom-2 -right-2 grid size-8 place-items-center rounded-full bg-white text-amber-800 shadow-md ring-2 ring-amber-950/20 transition hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <svg
                      className="size-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.25}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
                    </svg>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Profile picture file"
                    onChange={handlePictureChange}
                    className="sr-only"
                  />
                </>
              )}
            </div>
          }
          meta={
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-amber-100">
              {position}
            </span>
          }
        />

        <form
          onSubmit={handleSubmit(requestSave)}
          className="rounded-md border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-800"
        >
          <h3 className="mb-4 text-xl font-bold text-stone-900 dark:text-stone-100">
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
          {pictureError && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:bg-red-900/20 dark:text-red-300">
              {pictureError}
            </div>
          )}
          {isEditing && (
            <p className="mb-4 text-xs text-stone-500 dark:text-stone-400">
              Use the + button on your profile picture to upload a JPEG, PNG, or WebP image up to 2 MB.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('first_name')}
                readOnly={!isEditing}
                className={`${editableFieldClass} ${
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
                readOnly={!isEditing}
                className={`${editableFieldClass} ${
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
                readOnly={!isEditing}
                placeholder="09XX XXX XXXX"
                className={`${editableFieldClass} ${
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
              <input disabled readOnly value={displayValue(position)} className={readOnlyInputClass} />
            </div>
          </div>

          {isEditing && (
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={cancelEditing}
                disabled={isSubmitting}
                className="rounded-md border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-600 dark:text-stone-400 dark:hover:bg-stone-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (!isDirty && !pictureFile)}
                className="rounded-md bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Checking...' : 'Save changes'}
              </button>
            </div>
          )}
        </form>

        <Modal
          open={pendingSave !== null}
          onClose={closeConfirmation}
          title="Save profile changes?"
        >
          <p className="text-sm leading-6 text-stone-600 dark:text-stone-300">
            Are you sure you want to save these changes to your profile?
          </p>
          {pictureFile && (
            <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">
              Your new profile picture will also be saved.
            </p>
          )}
          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={closeConfirmation}
              disabled={isSaving}
              className="rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-600 dark:text-stone-400 dark:hover:bg-stone-700"
            >
              Keep editing
            </button>
            <button
              type="button"
              onClick={confirmSave}
              disabled={isSaving}
              className="rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </Modal>

        <div className="rounded-md border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-800">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Account</p>
              <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                Update your profile details or change your account password
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {!isEditing && (
                <button
                  type="button"
                  onClick={startEditing}
                  className="rounded-md bg-amber-700 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-amber-800"
                >
                  Edit profile
                </button>
              )}
              <Link
                to="/change-password"
                className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 dark:border-stone-600 dark:text-stone-400 dark:hover:bg-stone-700"
              >
                Change password
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
