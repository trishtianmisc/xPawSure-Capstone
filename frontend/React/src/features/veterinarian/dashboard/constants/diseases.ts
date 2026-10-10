export const SKIN_DISEASES = [
  'Allergic Dermatitis',
  'Bacterial',
  'Fungal',
  'Hotspot',
  'Mange',
] as const

export const OTHER_DISEASE = 'Other'

export const DISEASE_OPTIONS: string[] = [...SKIN_DISEASES, OTHER_DISEASE]

export function isSkinDisease(value: string): boolean {
  return (SKIN_DISEASES as readonly string[]).includes(value)
}
