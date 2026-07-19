import { useForm } from 'react-hook-form'

import { useLogin } from '../hooks/useLogin'
import {
  loginResolver,
  type LoginFormValues,
} from '../schemas/login.schema'
import { PasswordInput } from './PasswordInput'

export function LoginForm() {
  const { errorMessage, isSubmitting, submitLogin } = useLogin()
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
    resolver: loginResolver,
  })

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={handleSubmit(submitLogin)}
    >
      <div>
        <label className="mb-2 block text-sm font-semibold text-stone-800" htmlFor="email">
          Email address
        </label>
        <input
          {...register('email')}
          aria-describedby={errors.email ? 'email-error' : undefined}
          aria-invalid={Boolean(errors.email)}
          autoComplete="email"
          className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-sm text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-amber-700 focus:ring-4 focus:ring-amber-100 aria-[invalid=true]:border-red-600 aria-[invalid=true]:focus:ring-red-100"
          id="email"
          inputMode="email"
          placeholder="admin@xpawsure.com"
          type="email"
        />
        {errors.email?.message ? (
          <p className="mt-2 text-sm text-red-700" id="email-error" role="alert">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <PasswordInput
        error={errors.password?.message}
        registration={register('password')}
      />

      <label className="flex w-fit cursor-pointer items-center gap-3 text-sm text-stone-700">
        <input
          {...register('rememberMe')}
          className="size-4 rounded border-stone-300 text-amber-800 focus:ring-amber-700"
          type="checkbox"
        />
        Remember me on this device
      </label>

      {errorMessage ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <button
        className="flex h-12 w-full items-center justify-center rounded-xl bg-amber-900 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-amber-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800 disabled:cursor-not-allowed disabled:bg-stone-400"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
