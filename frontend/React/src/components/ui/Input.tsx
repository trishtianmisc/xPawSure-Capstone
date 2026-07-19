import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '_')

    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-semibold text-stone-800" htmlFor={inputId}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`h-11 w-full rounded-xl border bg-white px-4 text-sm text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:ring-4 ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
              : 'border-stone-300 focus:border-amber-700 focus:ring-amber-100'
          } ${className}`}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600" id={`${inputId}-error`} role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-sm text-stone-500" id={`${inputId}-hint`}>
            {hint}
          </p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
