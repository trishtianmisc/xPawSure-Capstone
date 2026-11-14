const DISEASE_DISPLAY_NAMES: Record<string, string> = {
  bacterial: 'Bacterial Infection',
  fungal: 'Fungal Infection',
}

export function formatDiseaseName(value: string): string {
  return DISEASE_DISPLAY_NAMES[value.trim().toLowerCase()] ?? value
}
