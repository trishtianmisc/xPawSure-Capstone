export const PRESCRIPTION_SHEET_WIDTH_PX = (210 / 25.4) * 96

export function prescriptionPreviewScale(availableWidth: number): number {
  if (!Number.isFinite(availableWidth) || availableWidth <= 0) return 1
  return Math.min(1, availableWidth / PRESCRIPTION_SHEET_WIDTH_PX)
}
