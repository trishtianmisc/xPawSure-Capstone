import { z } from 'zod'

export const createAppointmentSchema = z.object({
  pet_id: z.string().uuid('Select a pet'),
  slot_id: z.string().uuid('Select a time slot'),
  apt_type: z.enum(['CONSULTATION', 'FOLLOW_UP', 'VACCINATION', 'AI_REVIEW', 'EMERGENCY'], {
    required_error: 'Select appointment type',
  }),
  reason: z.string().optional(),
})

export type CreateAppointmentForm = z.infer<typeof createAppointmentSchema>

export const createPetSchema = z.object({
  owner_id: z.string().uuid('Select an owner'),
  pet_name: z.string().min(1, 'Pet name is required').max(100),
  pet_sex: z.enum(['MALE', 'FEMALE'], { required_error: 'Select sex' }),
  brd_id: z.string().uuid().nullable().optional(),
  pet_birth_date: z.string().nullable().optional(),
  pet_weight: z.number().positive().nullable().optional(),
  pet_color: z.string().max(100).nullable().optional(),
  pet_microchip_no: z.string().max(100).nullable().optional(),
})

export type CreatePetForm = z.infer<typeof createPetSchema>

export const updatePetSchema = z.object({
  pet_name: z.string().min(1).max(100).optional(),
  pet_sex: z.enum(['MALE', 'FEMALE']).optional(),
  brd_id: z.string().uuid().nullable().optional(),
  pet_birth_date: z.string().nullable().optional(),
  pet_weight: z.number().positive().nullable().optional(),
  pet_color: z.string().max(100).nullable().optional(),
  pet_microchip_no: z.string().max(100).nullable().optional(),
})

export type UpdatePetForm = z.infer<typeof updatePetSchema>
