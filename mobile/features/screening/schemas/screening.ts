import { z } from 'zod'

export const createScreeningSchema = z.object({
  pet_id: z.string().uuid('A valid pet is required'),
  source: z.enum(['MOCK', 'DEVICE']),
})

export type CreateScreeningFormValues = z.infer<typeof createScreeningSchema>
