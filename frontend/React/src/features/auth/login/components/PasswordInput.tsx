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
        <label className="text-sm font-semibold text-stone-800 dark:text-stone-200" htmlFor="password">
          Password
        </label>
        <a
          className="text-sm font-semibold text-amber-800 underline-offset-4 transition hover:text-amber-950 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
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
          className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 pr-20 text-sm text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-amber-700 focus:ring-4 focus:ring-amber-100 aria-[invalid=true]:border-red-600 aria-[invalid=true]:focus:ring-red-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-amber-500 dark:focus:ring-amber-900/40"
          id="password"
          placeholder="Enter your password"
          type={isPasswordVisible ? 'text' : 'password'}
        />
        <button
          aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 flex items-center rounded-r-xl px-4 text-amber-800 transition hover:text-amber-950 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
          onClick={() => setIsPasswordVisible((visible) => !visible)}
          type="button"
        >
          {isPasswordVisible ? (
            /* eye-slash: password is visible, click to hide */
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
              />
            </svg>
          ) : (
            /* eye: password is hidden, click to show */
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          )}
        </button>
      </div>

      {error ? (
        <p className="mt-2 text-sm text-red-700 dark:text-red-400" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
