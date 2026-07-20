import type { FieldErrors, Resolver } from 'react-hook-form'
import { z } from 'zod'

export const clinicSchema = z.object({
  name: z
    .string()
    .min(1, 'Clinic name is required.')
    .max(255, 'Clinic name must be under 255 characters.'),
  email: z
    .string()
    .min(1, 'Email address is required — the clinic admin account credentials will be sent there.')
    .email('Enter a valid email address.'),
  phone: z.string().optional(),
  address: z.string().optional(),
  license_number: z.string().optional(),
})

export type CreateClinicFormValues = z.infer<typeof clinicSchema>

export const clinicResolver: Resolver<CreateClinicFormValues> = async (values) => {
  const result = clinicSchema.safeParse(values)

  if (result.success) {
    return {
      values: result.data,
      errors: {},
    }
  }

  const errors = result.error.issues.reduce<FieldErrors<CreateClinicFormValues>>(
    (fieldErrors, issue) => {
      const fieldName = issue.path[0]

      if (typeof fieldName === 'string') {
        fieldErrors[fieldName as keyof CreateClinicFormValues] = {
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
