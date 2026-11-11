import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  createReceptionistSchema,
  createVeterinarianSchema,
  editStaffSchema,
} from './staff.schema'

const DIGITS_ERROR = 'License number must be exactly 7 digits.'
const REQUIRED_ERROR = 'License number is required for veterinarians'
const FUTURE_DATE = '2100-12-31'

const baseVet = {
  email: 'vet@clinic.com',
  first_name: 'Juan',
  last_name: 'Dela Cruz',
  phone: '09171234567',
  role: 'VETERINARIAN' as const,
  license_number: '0123456',
  license_expiration_date: FUTURE_DATE,
}

const baseReceptionist = {
  email: 'rec@clinic.com',
  first_name: 'Maria',
  last_name: 'Santos',
  phone: '09171234567',
  role: 'RECEPTIONIST' as const,
  license_number: '',
  license_expiration_date: '',
}

function messages(schema: z.ZodType, data: unknown): string[] {
  const result = schema.safeParse(data)
  if (result.success) return []
  return result.error.issues.map((issue) => issue.message)
}

describe('createVeterinarianSchema license_number', () => {
  it('accepts exactly 7 digits including leading zeros', () => {
    expect(messages(createVeterinarianSchema, baseVet)).toEqual([])
  })

  it('rejects fewer than 7 digits', () => {
    expect(
      messages(createVeterinarianSchema, { ...baseVet, license_number: '123456' }),
    ).toEqual([DIGITS_ERROR])
  })

  it('rejects more than 7 digits', () => {
    expect(
      messages(createVeterinarianSchema, { ...baseVet, license_number: '12345678' }),
    ).toEqual([DIGITS_ERROR])
  })

  it('rejects hyphenated and letter formats', () => {
    expect(
      messages(createVeterinarianSchema, { ...baseVet, license_number: 'PRC-12345' }),
    ).toEqual([DIGITS_ERROR])
    expect(
      messages(createVeterinarianSchema, { ...baseVet, license_number: 'ABCDEFG' }),
    ).toEqual([DIGITS_ERROR])
  })

  it('still requires a license number for veterinarians', () => {
    expect(
      messages(createVeterinarianSchema, { ...baseVet, license_number: '' }),
    ).toEqual([REQUIRED_ERROR])
  })
})

describe('createReceptionistSchema license_number', () => {
  it('accepts an empty or omitted license number', () => {
    expect(messages(createReceptionistSchema, baseReceptionist)).toEqual([])
    const withoutLicense = {
      email: 'rec@clinic.com',
      first_name: 'Maria',
      last_name: 'Santos',
      phone: '09171234567',
      role: 'RECEPTIONIST' as const,
      license_expiration_date: '',
    }
    expect(messages(createReceptionistSchema, withoutLicense)).toEqual([])
  })

  it('rejects a provided license number that is not 7 digits', () => {
    expect(
      messages(createReceptionistSchema, { ...baseReceptionist, license_number: 'PRC-12345' }),
    ).toEqual([DIGITS_ERROR])
    expect(
      messages(createReceptionistSchema, { ...baseReceptionist, license_number: '1234' }),
    ).toEqual([DIGITS_ERROR])
  })

  it('accepts a valid 7-digit license number', () => {
    expect(
      messages(createReceptionistSchema, { ...baseReceptionist, license_number: '1234567' }),
    ).toEqual([])
  })
})

describe('editStaffSchema license_number', () => {
  it('rejects a bad format for veterinarians', () => {
    expect(
      messages(editStaffSchema('VETERINARIAN'), {
        first_name: 'Juan',
        last_name: 'Dela Cruz',
        phone: '09171234567',
        license_number: 'LIC-001',
        license_expiration_date: FUTURE_DATE,
      }),
    ).toEqual([DIGITS_ERROR])
  })

  it('requires a license number for veterinarians when empty', () => {
    expect(
      messages(editStaffSchema('VETERINARIAN'), {
        first_name: 'Juan',
        last_name: 'Dela Cruz',
        phone: '09171234567',
        license_number: '',
        license_expiration_date: FUTURE_DATE,
      }),
    ).toEqual([REQUIRED_ERROR])
  })

  it('accepts a valid 7-digit license number for veterinarians', () => {
    expect(
      messages(editStaffSchema('VETERINARIAN'), {
        first_name: 'Juan',
        last_name: 'Dela Cruz',
        phone: '09171234567',
        license_number: '0123456',
        license_expiration_date: FUTURE_DATE,
      }),
    ).toEqual([])
  })

  it('leaves receptionist license optional but validates a provided value', () => {
    const base = {
      first_name: 'Maria',
      last_name: 'Santos',
      phone: '09171234567',
      license_number: '',
      license_expiration_date: '',
    }
    expect(messages(editStaffSchema('RECEPTIONIST'), base)).toEqual([])
    expect(
      messages(editStaffSchema('RECEPTIONIST'), { ...base, license_number: '12345678' }),
    ).toEqual([DIGITS_ERROR])
    expect(
      messages(editStaffSchema('RECEPTIONIST'), { ...base, license_number: '1234567' }),
    ).toEqual([])
  })
})
