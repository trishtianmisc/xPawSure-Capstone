import {
  PRESCRIPTION_SHEET_WIDTH_PX,
  prescriptionPreviewScale,
} from './prescriptionPreview'

describe('prescriptionPreviewScale', () => {
  it('keeps the A4 sheet at full size when there is enough width', () => {
    expect(prescriptionPreviewScale(PRESCRIPTION_SHEET_WIDTH_PX)).toBe(1)
    expect(prescriptionPreviewScale(PRESCRIPTION_SHEET_WIDTH_PX * 2)).toBe(1)
  })

  it('scales the whole sheet down instead of reflowing it', () => {
    expect(prescriptionPreviewScale(PRESCRIPTION_SHEET_WIDTH_PX / 2)).toBeCloseTo(0.5)
    expect(prescriptionPreviewScale(400)).toBeCloseTo(400 / PRESCRIPTION_SHEET_WIDTH_PX)
  })

  it('falls back to full size when the viewport cannot be measured', () => {
    expect(prescriptionPreviewScale(0)).toBe(1)
    expect(prescriptionPreviewScale(-10)).toBe(1)
    expect(prescriptionPreviewScale(Number.NaN)).toBe(1)
  })
})
