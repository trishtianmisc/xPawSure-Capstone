/**
 * Public pet-profile URL for QR codes. Returns null when the deployment has
 * not configured EXPO_PUBLIC_WEB_URL — callers must hide the QR instead of
 * rendering a dead localhost link.
 */
export function buildPetPublicUrl(qrCode: string): string | null {
  const raw = process.env.EXPO_PUBLIC_WEB_URL
  if (!raw || !raw.trim()) return null
  const baseUrl = raw.trim().replace(/\/+$/, '')
  return `${baseUrl}/pets/${encodeURIComponent(qrCode)}/public`
}
