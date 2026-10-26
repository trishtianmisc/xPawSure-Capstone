export function apiErrorCode(error: unknown): string | null {
  const data = (error as { response?: { data?: unknown } })?.response?.data
  if (data && typeof data === 'object') {
    const code = (data as Record<string, unknown>).code
    if (typeof code === 'string') return code
  }
  return null
}

export function apiErrorStatus(error: unknown): number | null {
  const status = (error as { response?: { status?: unknown } })?.response?.status
  return typeof status === 'number' ? status : null
}

export function apiErrorMessage(error: unknown): string {
  const data = (error as { response?: { data?: unknown } })?.response?.data
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    if (typeof record.detail === 'string') return record.detail
    for (const value of Object.values(record)) {
      if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
      if (typeof value === 'string') return value
    }
  }
  if (error instanceof Error && error.message) return error.message
  return 'Something went wrong. Please try again.'
}
