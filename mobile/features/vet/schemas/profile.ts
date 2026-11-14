import { z } from 'zod'

export const vetProfileSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(150, 'First name must be 150 characters or less'),
  last_name: z.string().min(1, 'Last name is required').max(150, 'Last name must be 150 characters or less'),
  phone: z.string().max(30, 'Phone must be 30 characters or less').optional(),
  profile_picture: z.string().optional(),
})

export type VetProfileFormValues = z.infer<typeof vetProfileSchema>
