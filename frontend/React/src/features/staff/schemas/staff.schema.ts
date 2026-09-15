import { z } from 'zod'

export const staffRoleSchema = z.enum(['VETERINARIAN', 'RECEPTIONIST'], {
  error: (issue) => (issue.input === undefined ? 'Please select a role' : 'Invalid role selected'),
})

const phoneRegex = /^(09\d{9}|\+63\d{10})$/
const nameRegex = /^[A-Za-zÀ-ÿ\u00C0-\u024F]+([.\u0027\u2019 -][A-Za-zÀ-ÿ\u00C0-\u024F]+)*$/
const NAME_ERROR = 'Name may only contain letters, spaces, hyphens, apostrophes, and periods.'

const nameField = z
  .string()
  .trim()
  .min(1, 'This field is required')
  .max(100)
  .refine((val) => nameRegex.test(val), NAME_ERROR)

const phoneField = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))
  .refine(
    (val) => !val || phoneRegex.test(val),
    'Phone must be a valid Philippine number (e.g. 09171234567)',
  )

const licenseDateField = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine(
    (val) => {
      if (!val) return true
      const d = new Date(val)
      return !isNaN(d.getTime()) && d >= new Date(new Date().toDateString())
    },
    'License expiration date cannot be in the past',
  )

export const createVeterinarianSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  first_name: nameField,
  last_name: nameField,
  phone: phoneField,
  role: z.literal('VETERINARIAN'),
  license_number: z.string().trim().min(1, 'License number is required for veterinarians').max(100),
      license_expiration_date: z.string().min(1, 'License expiration date is required').refine(
        (val) => {
          const d = new Date(val)
          return !isNaN(d.getTime()) && d >= new Date(new Date().toDateString())
        },
        'License expiration date cannot be in the past',
      ),
})

export const createReceptionistSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  first_name: nameField,
  last_name: nameField,
  phone: phoneField,
  role: z.literal('RECEPTIONIST'),
  license_number: z.string().optional().or(z.literal('')),
  license_expiration_date: licenseDateField,
})

export function editStaffSchema(role: string) {
  const base = {
    first_name: nameField,
    last_name: nameField,
    phone: phoneField,
  }

  if (role === 'VETERINARIAN') {
    return z.object({
      ...base,
      license_number: z.string().trim().min(1, 'License number is required for veterinarians').max(100),
  license_expiration_date: z.string().min(1, 'License expiration date is required').refine(
    (val) => {
      const d = new Date(val)
      return !isNaN(d.getTime()) && d >= new Date(new Date().toDateString())
    },
    'License expiration date cannot be in the past',
  ),
    })
  }

  return z.object({
    ...base,
    license_number: z.string().max(100).optional().or(z.literal('')),
    license_expiration_date: licenseDateField,
  })
}

export interface EditStaffFormData {
  first_name: string
  last_name: string
  phone?: string
  license_number?: string
  license_expiration_date?: string
}
