import { describe, expect, it } from 'vitest'

import { formatDiseaseLabel } from './diseases'

describe('formatDiseaseLabel', () => {
  it('shows the full name for bacterial and fungal results', () => {
    expect(formatDiseaseLabel('Bacterial')).toBe('Bacterial Infection')
    expect(formatDiseaseLabel('Fungal')).toBe('Fungal Infection')
  })

  it('matches known results case-insensitively and ignores surrounding whitespace', () => {
    expect(formatDiseaseLabel('  bacterial ')).toBe('Bacterial Infection')
    expect(formatDiseaseLabel('FUNGAL')).toBe('Fungal Infection')
  })

  it('leaves other and already-expanded names unchanged', () => {
    expect(formatDiseaseLabel('Mange')).toBe('Mange')
    expect(formatDiseaseLabel('Fungal Infection')).toBe('Fungal Infection')
  })
})
