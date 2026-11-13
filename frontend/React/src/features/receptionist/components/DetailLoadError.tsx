import { apiErrorMessage, isNotFoundError } from '../../../utils/error'

interface DetailLoadErrorProps {
  /** Displayed entity name, e.g. "Owner", "Patient", "Appointment". */
  entity: string
  error: unknown
  onRetry: () => void
  isRetrying?: boolean
  onBack?: () => void
}

/**
 * Load-failure state for detail pages: a genuine 404 renders a dead-end
 * "not found" message; anything else offers a retry so transient failures
 * are not mistaken for missing records.
 */
export function DetailLoadError({
  entity,
  error,
  onRetry,
  isRetrying,
  onBack,
}: DetailLoadErrorProps) {
  const notFound = error == null || isNotFoundError(error)

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
      {notFound ? (
        <>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">
            {entity} not found
          </p>
          <p className="mt-1 max-w-sm text-xs text-stone-400 dark:text-stone-500">
            It may have been removed, or the link is incorrect.
          </p>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="mt-4 rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Go back
            </button>
          )}
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">
            Failed to load {entity.toLowerCase()}
          </p>
          <p className="mt-1 max-w-sm text-xs text-stone-400 dark:text-stone-500">
            {apiErrorMessage(error)}
          </p>
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="mt-4 rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:opacity-50"
          >
            {isRetrying ? 'Retrying…' : 'Try again'}
          </button>
        </>
      )}
    </div>
  )
}
