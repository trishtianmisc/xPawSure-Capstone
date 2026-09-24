export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('63') && digits.length === 12) {
    return `0${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 12)}`
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`
  }
  return phone
}

export function normalizePhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('0') && digits.length <= 11) {
    return digits
  }
  if (digits.startsWith('63') && digits.length <= 12) {
    return '0' + digits.slice(2)
  }
  if (digits.startsWith('9') && digits.length <= 10) {
    return '0' + digits
  }
  return digits
}
