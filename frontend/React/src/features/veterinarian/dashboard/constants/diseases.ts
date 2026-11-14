export const SKIN_DISEASES = [
  'Allergic Dermatitis',
  'Bacterial',
  'Fungal',
  'Hotspot',
  'Mange',
] as const

export const OTHER_DISEASE = 'Other'

export const DISEASE_OPTIONS: string[] = [...SKIN_DISEASES, OTHER_DISEASE]

const DISEASE_DISPLAY_NAMES: Record<string, string> = {
  bacterial: 'Bacterial Infection',
  fungal: 'Fungal Infection',
}

export function formatDiseaseLabel(value: string): string {
  return DISEASE_DISPLAY_NAMES[value.trim().toLowerCase()] ?? value
}

export function isSkinDisease(value: string): boolean {
  return (SKIN_DISEASES as readonly string[]).includes(value)
}
