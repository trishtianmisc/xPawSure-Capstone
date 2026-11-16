import type { FieldErrors, Resolver } from 'react-hook-form'
import { z } from 'zod'

const optionalCoordinate = (minimum: number, maximum: number, label: string) => z.preprocess(
  (value) => value === '' || value === undefined || (typeof value === 'number' && Number.isNaN(value))
    ? undefined
    : value,
  z.number()
    .min(minimum, `${label} must be at least ${minimum}.`)
    .max(maximum, `${label} must be at most ${maximum}.`)
    .optional(),
)

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
  latitude: optionalCoordinate(-90, 90, 'Latitude'),
  longitude: optionalCoordinate(-180, 180, 'Longitude'),
  license_number: z.string().optional(),
}).refine(
  (data) => (data.latitude === undefined) === (data.longitude === undefined),
  {
    message: 'Enter both latitude and longitude, or leave both blank.',
    path: ['latitude'],
  },
)

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
