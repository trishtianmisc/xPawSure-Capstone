const DEFAULT_WEB_URL = 'http://localhost:5173'

export function buildPetPublicUrl(qrCode: string): string {
  const baseUrl = (process.env.EXPO_PUBLIC_WEB_URL || DEFAULT_WEB_URL).replace(/\/+$/, '')
  return `${baseUrl}/pets/${encodeURIComponent(qrCode)}/public`
}
