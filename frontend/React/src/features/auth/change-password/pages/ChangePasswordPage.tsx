import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import { apiErrorMessage } from '../../../../utils/error'
import { Wordmark } from '../../login/components/LabelIcon'

import {
  changePasswordSchema,
  type ChangePasswordFormData,
} from '../schemas/change-password.schema'

function EyeToggle({
  visible,
  onToggle,
}: {
  visible: boolean
  onToggle: () => void
}) {


  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visible ? 'Hide password' : 'Show password'}
      aria-pressed={visible}
      className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-stone-400 transition hover:text-stone-700 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-amber-700 dark:text-stone-500 dark:hover:text-stone-200"
    >
      <svg
        aria-hidden="true"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={
            visible
              ? 'M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88'
              : 'M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z'
          }
        />
      </svg>
    </button>
  )
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

// Same pill as the login page's back button: frosted white on the peach
// panel (desktop), light stone on the white card (small screens).
const BACK_BUTTON_CLASSES =
  'group absolute left-5 top-5 z-20 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-100 py-2 pl-3 pr-4 text-sm font-semibold text-stone-700 transition hover:border-stone-300 hover:bg-stone-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700 lg:border-amber-950/15 lg:bg-white/60 lg:text-amber-950 lg:backdrop-blur-sm lg:hover:border-amber-950/25 lg:hover:bg-white/85 dark:lg:border-amber-950/15 dark:lg:bg-white/60 dark:lg:text-amber-950 dark:lg:hover:bg-white/85 sm:left-6 sm:top-6'

function BackArrow() {
  return (
    <svg
      aria-hidden="true"
      className="size-4 transition-transform group-hover:-translate-x-0.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChangePasswordPage() {
  const { user, isAuthenticated, changePassword, updateUser, logout } = useAuth()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<ChangePasswordFormData>({
    defaultValues: { old_password: '', new_password: '', confirm_password: '' },
    resolver: zodResolver(changePasswordSchema),
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
      setErrorMessage(apiErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const [visible, setVisible] = useState({
    old_password: false,
    new_password: false,
    confirm_password: false,
  })

  function toggleVisible(field: keyof typeof visible) {
    setVisible((current) => ({ ...current, [field]: !current[field] }))
  }

  // First-time setup is mandatory, so "back" can't skip to the dashboard:
  // it signs out and returns to the login page instead.
  async function handleBackToLogin() {
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <main className="min-h-screen bg-stone-100 p-4 dark:bg-stone-950 sm:p-5 lg:p-7">
      <div className="relative mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-stone-900/10 dark:bg-stone-900 dark:shadow-black/30 sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[0.9fr_1.1fr]">
        {/* Back button, top-left corner of the card */}
        {isFirstLogin ? (
          <button
            className={BACK_BUTTON_CLASSES}
            onClick={() => void handleBackToLogin()}
            type="button"
          >
            <BackArrow />
            <span>Back to login</span>
          </button>
        ) : (
          <Link className={BACK_BUTTON_CLASSES} to={dashboardPath}>
            <BackArrow />
            <span>Back to dashboard</span>
          </Link>
        )}

        <section className="relative hidden overflow-hidden bg-[#f4d0a5] p-12 text-amber-950 lg:flex lg:flex-col lg:justify-center lg:gap-1">
          <div aria-hidden="true" className="absolute -bottom-13 size-25 rounded-full bg-amber-950/80" />
          <div aria-hidden="true" className="absolute -left-12 -top-12 size-40 rounded-full bg-amber-950/50" />
          <div aria-hidden="true" className="absolute -bottom-16 -right-2 size-58 rounded-full border-[1.5rem] border-amber-950/20" />
          <div aria-hidden="true" className="absolute -top-1 -right-2 size-40 rounded-full bg-amber-950/90" />

          <div className="relative flex items-center gap-3 text-xl font-extrabold tracking-tight">
            <img
              src="/Component 1.png"
              alt="XPawSure"
              className="-mt-2 h-8 w-auto drop-shadow-2xl sm:h-5 lg:h-15"
            />
          </div>

          <div className="relative max-w-sm">
            <div className="mb-2 grid size-30 place-items-center rounded-full border-8 border-amber-950/15 bg-white/55 text-6xl">
              <img
                src="/xpawsure-logo.png"
                alt="XPawSure"
                className="size-30 object-contain"
              />
            </div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-amber-900/75">
              Clinic workspace
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

        {/* Extra top padding on small screens so the back button never
            collides with the logo block. */}
        <section className="flex items-center justify-center px-6 pb-12 pt-24 sm:px-12 lg:px-20 lg:py-12">
          <div className="w-full max-w-md">
            <div className="mb-10 lg:hidden">
              <div className="mb-6 flex items-center gap-3 text-xl font-extrabold tracking-tight text-amber-950 dark:text-amber-300">
                <span className="grid size-11 place-items-center rounded-2xl bg-amber-950 text-2xl text-[#f4d0a5]" aria-hidden="true">
                  🐾
                </span>
                XPawSure
              </div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-400">
                Clinic workspace
              </p>
            </div>

            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-400">
                {isFirstLogin ? 'First time setup' : 'Account security'}
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-stone-950 dark:text-stone-100 sm:text-4xl">
                {isFirstLogin ? 'Set your password for ' : 'Update your password for '}
                <span><Wordmark /></span>
              </h2>
              {displayName ? (
                <p className="mt-3 text-base text-stone-600 dark:text-stone-400">
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
                    type={visible.old_password ? 'text' : 'password'}
                  />
                  <EyeToggle
                    visible={visible.old_password}
                    onToggle={() => toggleVisible('old_password')}
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
                    type={visible.new_password ? 'text' : 'password'} 
                  />
                  <EyeToggle
                    visible={visible.new_password}
                    onToggle={() => toggleVisible('new_password')}
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
                    type={visible.confirm_password ? 'text' : 'password'}
                  />
                  <EyeToggle
                    visible={visible.confirm_password}
                    onToggle={() => toggleVisible('confirm_password')}
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
