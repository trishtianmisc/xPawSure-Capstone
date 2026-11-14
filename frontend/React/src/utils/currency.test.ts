import { describe, expect, it } from 'vitest'

import { formatPeso, formatPesoCompact } from './currency'

describe('formatPeso', () => {
  it('formats fixed-decimal strings from the API', () => {
    expect(formatPeso('12500.00')).toBe('₱12,500.00')
    expect(formatPeso(0)).toBe('₱0.00')
  })
})

describe('formatPesoCompact', () => {
  it('renders whole pesos under a thousand without decimals', () => {
    expect(formatPesoCompact(0)).toBe('₱0')
    expect(formatPesoCompact(450)).toBe('₱450')
    expect(formatPesoCompact('999.99')).toBe('₱1000')
  })

  it('abbreviates thousands with at most one decimal', () => {
    expect(formatPesoCompact('5000')).toBe('₱5k')
    expect(formatPesoCompact('1200')).toBe('₱1.2k')
    expect(formatPesoCompact('12500.00')).toBe('₱12.5k')
    expect(formatPesoCompact('123456')).toBe('₱123.5k')
  })

  it('keeps the sign for negative amounts', () => {
    expect(formatPesoCompact(-2500)).toBe('-₱2.5k')
  })
})
