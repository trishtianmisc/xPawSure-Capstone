import { z } from 'zod'

export const appointmentBookingSchema = z.object({
  apt_type: z.enum(['CONSULTATION', 'FOLLOW_UP', 'VACCINATION', 'AI_REVIEW', 'EMERGENCY']),
  reason: z.string().max(500, 'Reason must be 500 characters or less').optional(),
})

export type AppointmentBookingFormValues = z.infer<typeof appointmentBookingSchema>
