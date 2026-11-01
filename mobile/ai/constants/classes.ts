/**
 * Class order must match the trained EfficientNetB0 output index order.
 * Changing this order silently changes the meaning of every prediction.
 */
export const SCREENING_CLASS_ORDER = [
  'ALLERGIC_DERMATITIS',
  'BACTERIAL',
  'FUNGAL',
  'HOTSPOT',
  'MANGE',
] as const
