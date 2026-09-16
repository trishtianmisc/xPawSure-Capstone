import { useState } from 'react'
import { useCreateStaff } from '../hooks/useCreateStaff'
import { StaffForm } from './StaffForm'
import type { CreateStaffPayload, CreateStaffResponse } from '../types/staff.types'

interface AddStaffModalProps {
  isOpen: boolean
  onClose: () => void
}

type Step = 'select-role' | 'form'

export function AddStaffModal({ isOpen, onClose }: AddStaffModalProps) {
  const [step, setStep] = useState<Step>('select-role')
  const [selectedRole, setSelectedRole] = useState<'VETERINARIAN' | 'RECEPTIONIST' | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [createdStaff, setCreatedStaff] = useState<CreateStaffResponse | null>(null)

  const { mutateAsync: createStaff, isPending } = useCreateStaff()

  if (!isOpen) return null

  const handleRoleSelect = (role: 'VETERINARIAN' | 'RECEPTIONIST') => {
    setSelectedRole(role)
    setServerError(null)
    setStep('form')
  }

  const handleSubmit = async (data: CreateStaffPayload) => {
    setServerError(null)
    try {
      const result = await createStaff(data)
      setCreatedStaff(result)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to create staff member')
    }
  }

  const handleReset = () => {
    setStep('select-role')
    setSelectedRole(null)
    setServerError(null)
    setCreatedStaff(null)
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-lg rounded-2xl bg-white shadow-xl dark:bg-stone-900">
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 dark:border-stone-700">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
            {createdStaff
              ? 'Staff Created'
              : step === 'select-role'
                ? 'Add Staff Member'
                : `New ${selectedRole === 'VETERINARIAN' ? 'Veterinarian' : 'Receptionist'}`}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {createdStaff ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-400">
                <p className="font-semibold">{createdStaff.first_name} {createdStaff.last_name} has been created successfully.</p>
                <p className="mt-1">Role: {createdStaff.role}</p>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  Temporary Password
                </p>
                <p className="mt-1 font-mono text-lg font-bold text-amber-900 dark:text-amber-300">
                  {createdStaff.temp_password}
                </p>
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  This password will be emailed to {createdStaff.email}. The staff member must change it on first login.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={handleReset}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  Add Another
                </button>
                <button
                  onClick={handleClose}
                  className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-950"
                >
                  Done
                </button>
              </div>
            </div>
          ) : step === 'select-role' ? (
            <div className="space-y-3">
              <p className="text-sm text-stone-600 dark:text-stone-400">
                Select the type of staff member you want to add:
              </p>

              <button
                onClick={() => handleRoleSelect('VETERINARIAN')}
                className="w-full rounded-xl border border-stone-200 p-4 text-left transition hover:border-amber-200 hover:shadow-sm dark:border-stone-700 dark:hover:border-amber-700"
              >
                <span className="text-2xl">🩺</span>
                <p className="mt-1 text-sm font-bold text-stone-900 dark:text-stone-100">Veterinarian</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Can diagnose, treat pets, create prescriptions
                </p>
              </button>

              <button
                onClick={() => handleRoleSelect('RECEPTIONIST')}
                className="w-full rounded-xl border border-stone-200 p-4 text-left transition hover:border-amber-200 hover:shadow-sm dark:border-stone-700 dark:hover:border-amber-700"
              >
                <span className="text-2xl">📋</span>
                <p className="mt-1 text-sm font-bold text-stone-900 dark:text-stone-100">Receptionist</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Manages appointments, check-ins, owner communication
                </p>
              </button>
            </div>
          ) : (
            <StaffForm
              role={selectedRole}
              onSubmit={handleSubmit}
              onCancel={() => setStep('select-role')}
              isSubmitting={isPending}
              serverError={serverError}
            />
          )}
        </div>
      </div>
    </div>
  )
}
