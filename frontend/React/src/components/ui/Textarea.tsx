import { forwardRef, type TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '_')

    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-semibold text-stone-800 dark:text-stone-200" htmlFor={textareaId}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:ring-4 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500 ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-100 dark:focus:ring-red-900/40'
              : 'border-stone-300 focus:border-amber-700 focus:ring-amber-100 dark:focus:border-amber-500 dark:focus:ring-amber-900/40'
          } ${className}`}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'
