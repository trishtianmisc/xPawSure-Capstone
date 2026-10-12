export function apiErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const err = error as Error & { response?: { data?: unknown } }
    const data = err.response?.data
    if (typeof data === 'object' && data !== null) {
      const record = data as Record<string, unknown>
      if (typeof record.detail === 'string') {
        return record.detail
      }
      return Object.values(record).flat().join(', ')
    }
    return err.message
  }
  return 'An unexpected error occurred.'
}
