import { describe, expect, it } from 'vitest'

import { agreementRate } from './agreementRate'

describe('agreementRate', () => {
  it('returns the confirmed share of judged screenings', () => {
    expect(agreementRate({ vet_confirmed: 3, vet_changed: 1 })).toBe(75)
  })

  it('ignores pending (unjudged) screenings by excluding them from the base', () => {
    expect(agreementRate({ vet_confirmed: 2, vet_changed: 2 })).toBe(50)
  })

  it('returns null when nothing has been judged', () => {
    expect(agreementRate({ vet_confirmed: 0, vet_changed: 0 })).toBeNull()
  })

  it('returns 0 when every judged screening was changed', () => {
    expect(agreementRate({ vet_confirmed: 0, vet_changed: 4 })).toBe(0)
  })

  it('rounds to one decimal place', () => {
    expect(agreementRate({ vet_confirmed: 2, vet_changed: 1 })).toBe(66.7)
  })
})
