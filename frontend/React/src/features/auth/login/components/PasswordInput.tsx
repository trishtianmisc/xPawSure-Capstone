import { useState } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'

interface PasswordInputProps {
  error?: string
  registration: UseFormRegisterReturn
}

export function PasswordInput({ error, registration }: PasswordInputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const errorId = 'password-error'

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <label className="text-sm font-semibold text-stone-800" htmlFor="password">
          Password
        </label>
        <a
          className="text-sm font-semibold text-amber-800 underline-offset-4 transition hover:text-amber-950 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
          href="mailto:support@xpawsure.com?subject=XPawSure%20password%20reset"
        >
          Forgot password?
        </a>
      </div>

      <div className="relative">
        <input
          {...registration}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          autoComplete="current-password"
          className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 pr-20 text-sm text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-amber-700 focus:ring-4 focus:ring-amber-100 aria-[invalid=true]:border-red-600 aria-[invalid=true]:focus:ring-red-100"
          id="password"
          placeholder="Enter your password"
          type={isPasswordVisible ? 'text' : 'password'}
        />
        <button
          aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 rounded-r-xl px-4 text-sm font-semibold text-amber-800 transition hover:text-amber-950 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-amber-700"
          onClick={() => setIsPasswordVisible((visible) => !visible)}
          type="button"
        >
          {isPasswordVisible ? 'Hide' : 'Show'}
        </button>
      </div>

      {error ? (
        <p className="mt-2 text-sm text-red-700" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
