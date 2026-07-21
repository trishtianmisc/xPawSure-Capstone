import { z } from 'zod'

export const petSchema = z.object({
  name: z.string().min(1, 'Pet name is required').max(100, 'Pet name must be 100 characters or less'),
  breed_id: z.string().min(1, 'Breed is required'),
  sex: z.enum(['MALE', 'FEMALE']),
  date_of_birth: z.string().optional(),
  weight: z.string().optional(),
  color: z.string().optional(),
  microchip_number: z.string().optional(),
  profile_picture: z.string().optional(),
})

export type PetFormValues = z.infer<typeof petSchema>
