import type { FieldErrors, Resolver } from 'react-hook-form'
import { z } from 'zod'

import type { CreateVeterinarianPayload } from '../types/veterinarian.types'

export const createVeterinarianSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name is required.')
    .max(100, 'First name must be at most 100 characters.'),
  last_name: z
    .string()
    .min(1, 'Last name is required.')
    .max(100, 'Last name must be at most 100 characters.'),
  email: z
    .string()
    .min(1, 'Email address is required.')
    .email('Enter a valid email address.'),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length <= 20,
      'Phone number must be at most 20 characters.',
    ),
  license_number: z
    .string()
    .min(1, 'License number is required.'),
  license_expiration_date: z
    .string()
    .optional()
    .nullable(),
})

export type CreateVeterinarianFormValues = z.infer<typeof createVeterinarianSchema>

export const createVeterinarianResolver: Resolver<CreateVeterinarianFormValues> = async (values) => {
  const result = createVeterinarianSchema.safeParse(values)

  if (result.success) {
    return {
      values: result.data,
      errors: {},
    }
  }

  const errors = result.error.issues.reduce<FieldErrors<CreateVeterinarianFormValues>>(
    (fieldErrors, issue) => {
      const fieldName = issue.path[0]

      if (typeof fieldName === 'string') {
        fieldErrors[fieldName as keyof CreateVeterinarianPayload] = {
          type: issue.code,
          message: issue.message,
        }
      }

      return fieldErrors
    },
    {},
  )

  return {
    values: {},
    errors,
  }
}
