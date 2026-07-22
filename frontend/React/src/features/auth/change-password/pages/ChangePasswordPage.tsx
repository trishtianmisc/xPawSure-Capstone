import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import {
  changePasswordSchema,
  type ChangePasswordFormData,
} from '../schemas/change-password.schema'
import type { Resolver } from 'react-hook-form'
import type { FieldErrors } from 'react-hook-form'

const changePasswordResolver: Resolver<ChangePasswordFormData> = async (values) => {
  const result = changePasswordSchema.safeParse(values)
  if (result.success) {
    return { values: result.data, errors: {} }
  }
  const errors = result.error.issues.reduce<FieldErrors<ChangePasswordFormData>>(
    (fieldErrors, issue) => {
      const fieldName = issue.path[0]
      if (typeof fieldName === 'string') {
        fieldErrors[fieldName as keyof ChangePasswordFormData] = {
          type: issue.code,
          message: issue.message,
        }
      }
      return fieldErrors
    },
    {},
  )
  return { values: {} as ChangePasswordFormData, errors }
}

function getRoleDashboardPath(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/super-admin/dashboard'
    case 'CLINIC_ADMIN':
      return '/clinic/dashboard'
    case 'VETERINARIAN':
      return '/veterinarian/dashboard'
    case 'RECEPTIONIST':
      return '/receptionist/dashboard'
    default:
      return '/'
  }
}

export function ChangePasswordPage() {
  const { user, isAuthenticated, changePassword, updateUser } = useAuth()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<ChangePasswordFormData>({
    defaultValues: { old_password: '', new_password: '', confirm_password: '' },
    resolver: changePasswordResolver,
  })

  if (!isAuthenticated) {
    return <Navigate replace to="/login" />
  }

  const isFirstLogin = user?.must_change_password ?? false
  const displayName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email : ''
  const dashboardPath = user ? getRoleDashboardPath(user.role) : '/'

  const onSubmit = async (data: ChangePasswordFormData) => {
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      await changePassword(data.old_password, data.new_password)
      if (user) {
        updateUser({ ...user, must_change_password: false })
      }
      navigate(dashboardPath, { replace: true })
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to change password. Please try again.'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-stone-100 p-4 dark:bg-stone-950 sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-stone-900/10 dark:bg-stone-900 dark:shadow-black/30 sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden overflow-hidden bg-[#f4d0a5] p-12 text-amber-950 lg:flex lg:flex-col lg:justify-between">
          <div aria-hidden="true" className="absolute -left-12 -top-12 size-40 rounded-full bg-amber-950/90" />
          <div aria-hidden="true" className="absolute -bottom-16 -right-14 size-56 rounded-full border-[1.5rem] border-amber-950/20" />
          <div aria-hidden="true" className="absolute right-12 top-16 text-6xl text-amber-950/90">
            🐾
          </div>

          <div className="relative flex items-center gap-3 text-xl font-extrabold tracking-tight">
            <span className="grid size-11 place-items-center rounded-2xl bg-amber-950 text-2xl text-[#f4d0a5]" aria-hidden="true">
              🐾
            </span>
            XPawSure
          </div>

          <div className="relative max-w-sm">
            <div className="mb-8 grid size-28 place-items-center rounded-full border-8 border-amber-950/15 bg-white/55 text-6xl">
              🔐
            </div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-amber-900/75">
              {isFirstLogin ? 'First time setup' : 'Account security'}
            </p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight">
              {isFirstLogin
                ? 'Set up your password to get started.'
                : 'Update your password anytime.'}
            </h1>
            <p className="mt-5 max-w-xs text-base leading-7 text-amber-950/75">
              {isFirstLogin
                ? 'Secure your account by choosing a strong, unique password before accessing the system.'
                : 'Choose a strong password that you have not used before.'}
            </p>
          </div>

          <p className="relative text-sm font-medium text-amber-950/70">
            AI-assisted screening supports, but never replaces, veterinary judgment.
          </p>
        </section>

        <section className="flex items-center justify-center px-6 py-12 sm:px-12 lg:px-20">
          <div className="w-full max-w-md">
            <div className="mb-10 lg:hidden">
              <div className="mb-6 flex items-center gap-3 text-xl font-extrabold tracking-tight text-amber-950 dark:text-amber-300">
                <span className="grid size-11 place-items-center rounded-2xl bg-amber-950 text-2xl text-[#f4d0a5]" aria-hidden="true">
                  🐾
                </span>
                XPawSure
              </div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-400">
                {isFirstLogin ? 'First time setup' : 'Account security'}
              </p>
            </div>

            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-400">
                {isFirstLogin ? 'Welcome to XPawSure' : 'Change password'}
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-stone-950 dark:text-stone-100 sm:text-4xl">
                {isFirstLogin ? 'Set your password' : 'Update your password'}
              </h2>
              {displayName ? (
                <p className="mt-2 text-base text-stone-600 dark:text-stone-400">
                  Signed in as <span className="font-semibold text-stone-800 dark:text-stone-200">{displayName}</span>
                </p>
              ) : null}
              {isFirstLogin ? (
                <p className="mt-3 text-base leading-7 text-stone-600 dark:text-stone-400">
                  This is your first time signing in. Please set a new password to continue.
                </p>
              ) : null}
            </div>

            <form
              className="space-y-5"
              noValidate
              onSubmit={handleSubmit(onSubmit)}
            >
              <div>
                <label className="mb-2 block text-sm font-semibold text-stone-800 dark:text-stone-200" htmlFor="old_password">
                  Current password
                </label>
                <div className="relative">
                  <input
                    {...register('old_password')}
                    aria-describedby={errors.old_password ? 'old-password-error' : undefined}
                    aria-invalid={Boolean(errors.old_password)}
                    autoComplete="current-password"
                    className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 pr-20 text-sm text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-amber-700 focus:ring-4 focus:ring-amber-100 aria-[invalid=true]:border-red-600 aria-[invalid=true]:focus:ring-red-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-amber-500 dark:focus:ring-amber-900/40"
                    id="old_password"
                    placeholder={isFirstLogin ? 'Temporary password from email' : 'Enter current password'}
                    type="password"
                  />
                </div>
                {errors.old_password?.message ? (
                  <p className="mt-2 text-sm text-red-700 dark:text-red-400" id="old-password-error" role="alert">
                    {errors.old_password.message}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-stone-800 dark:text-stone-200" htmlFor="new_password">
                  New password
                </label>
                <div className="relative">
                  <input
                    {...register('new_password')}
                    aria-describedby={errors.new_password ? 'new-password-error' : undefined}
                    aria-invalid={Boolean(errors.new_password)}
                    autoComplete="new-password"
                    className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 pr-20 text-sm text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-amber-700 focus:ring-4 focus:ring-amber-100 aria-[invalid=true]:border-red-600 aria-[invalid=true]:focus:ring-red-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-amber-500 dark:focus:ring-amber-900/40"
                    id="new_password"
                    placeholder="At least 8 characters"
                    type="password"
                  />
                </div>
                {errors.new_password?.message ? (
                  <p className="mt-2 text-sm text-red-700 dark:text-red-400" id="new-password-error" role="alert">
                    {errors.new_password.message}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-stone-800 dark:text-stone-200" htmlFor="confirm_password">
                  Confirm new password
                </label>
                <div className="relative">
                  <input
                    {...register('confirm_password')}
                    aria-describedby={errors.confirm_password ? 'confirm-password-error' : undefined}
                    aria-invalid={Boolean(errors.confirm_password)}
                    autoComplete="new-password"
                    className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 pr-20 text-sm text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-amber-700 focus:ring-4 focus:ring-amber-100 aria-[invalid=true]:border-red-600 aria-[invalid=true]:focus:ring-red-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-amber-500 dark:focus:ring-amber-900/40"
                    id="confirm_password"
                    placeholder="Re-enter new password"
                    type="password"
                  />
                </div>
                {errors.confirm_password?.message ? (
                  <p className="mt-2 text-sm text-red-700 dark:text-red-400" id="confirm-password-error" role="alert">
                    {errors.confirm_password.message}
                  </p>
                ) : null}
              </div>

              {errorMessage ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-900/30 dark:text-red-400" role="alert">
                  {errorMessage}
                </p>
              ) : null}

              <button
                className="flex h-12 w-full items-center justify-center rounded-xl bg-amber-900 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-amber-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800 disabled:cursor-not-allowed disabled:bg-stone-400 dark:disabled:bg-stone-700"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting
                  ? 'Setting password…'
                  : isFirstLogin
                    ? 'Set password & continue'
                    : 'Update password'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  )
}
