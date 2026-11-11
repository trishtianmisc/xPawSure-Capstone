export function normalizeCapturedImageUri(uri: string): string {
  const value = uri.trim()
  if (!value) return value

  // Keep native and data URI schemes intact. View-shot normally returns a
  // file URI, but some Android versions return an absolute path instead.
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value

  return `file://${value.startsWith('/') ? '' : '/'}${value}`
}
