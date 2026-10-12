import { z } from 'zod'

export const createScreeningSchema = z.object({
  pet_id: z.string().uuid('A valid pet is required'),
  source: z.literal('DEVICE'),
  prediction: z.string().min(1, 'A prediction is required'),
  confidence: z.number().min(0).max(100),
  model_version: z.string().min(1, 'A model version is required'),
  inference_time_ms: z.number().int().min(0).optional(),
  device: z.string().optional(),
})

export type CreateScreeningFormValues = z.infer<typeof createScreeningSchema>
