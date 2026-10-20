function flattenErrorValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(flattenErrorValues)
  }
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).flatMap(flattenErrorValues)
  }
  if (value === null || value === undefined) {
    return []
  }
  return [String(value)]
}

export function apiErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const err = error as Error & { response?: { data?: unknown } }
    const data = err.response?.data
    if (typeof data === 'object' && data !== null) {
      const record = data as Record<string, unknown>
      if (typeof record.detail === 'string') {
        return record.detail
      }
      const flattened = flattenErrorValues(record).join(', ')
      return flattened || err.message
    }
    return err.message
  }
  return 'An unexpected error occurred.'
}
