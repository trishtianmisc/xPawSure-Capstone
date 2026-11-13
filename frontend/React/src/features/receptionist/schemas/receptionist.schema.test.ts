import { describe, expect, it } from 'vitest'

import { createPetSchema } from './receptionist.schema'

const VALID_OWNER_ID = '123e4567-e89b-42d3-a456-426614174000'

const validPayload = {
  owner_id: VALID_OWNER_ID,
  pet_name: 'Rex',
  pet_sex: 'MALE' as const,
}

describe('createPetSchema', () => {
  it('accepts the required fields alone', () => {
    expect(createPetSchema.safeParse(validPayload).success).toBe(true)
  })

  it('accepts every optional field explicitly null', () => {
    const result = createPetSchema.safeParse({
      ...validPayload,
      brd_id: null,
      pet_birth_date: null,
      pet_weight: null,
      pet_color: null,
      pet_microchip_no: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects a missing owner', () => {
    const result = createPetSchema.safeParse({ ...validPayload, owner_id: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Select an owner')
    }
  })

  it('rejects a missing pet name', () => {
    const result = createPetSchema.safeParse({ ...validPayload, pet_name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Pet name is required')
    }
  })

  it('rejects an unknown sex', () => {
    const result = createPetSchema.safeParse({
      ...validPayload,
      pet_sex: 'UNKNOWN',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a non-positive weight', () => {
    const result = createPetSchema.safeParse({
      ...validPayload,
      pet_weight: -2,
    })
    expect(result.success).toBe(false)
  })
})
