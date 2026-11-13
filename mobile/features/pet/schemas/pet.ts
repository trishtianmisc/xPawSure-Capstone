import { z } from 'zod'

import { isFutureIsoDate, isValidIsoDate } from '../lib/date'

export const petSchema = z.object({
  name: z.string().min(1, 'Pet name is required').max(100, 'Pet name must be 100 characters or less'),
  breed_id: z.string().min(1, 'Breed is required'),
  sex: z.enum(['MALE', 'FEMALE']),
  date_of_birth: z
    .string()
    .refine((v) => v === '' || isValidIsoDate(v), 'Enter a valid date (YYYY-MM-DD)')
    .refine((v) => v === '' || !isFutureIsoDate(v), 'Birth date cannot be in the future')
    .optional(),
  weight: z.string().optional(),
  color: z.string().optional(),
  microchip_number: z.string().optional(),
  profile_picture: z.string().optional(),
})

export type PetFormValues = z.infer<typeof petSchema>
