import { z } from 'zod'

export const profileSchema = z.object({
  name: z
    .string()
    .min(1, 'Clinic name is required.')
    .max(255, 'Clinic name must be under 255 characters.'),
  email: z
    .string()
    .email('Enter a valid email address.')
    .or(z.literal(''))
    .nullable(),
  phone: z
    .string()
    .regex(/^(09\d{9}|\+63\d{10})?$/, 'Phone must be 09XXXXXXXXX or +63XXXXXXXXXX.')
    .or(z.literal(''))
    .nullable(),
  address: z.string().min(1, 'Address is required.'),
})

export type ProfileFormValues = z.infer<typeof profileSchema>

export const settingsSchema = z.object({
  appointment_duration: z
    .number({ error: 'Must be a number.' })
    .int('Must be a whole number.')
    .min(1, 'Must be greater than 0.')
    .max(240, 'Must be 240 minutes or less.'),
  max_appointments_per_day: z
    .number({ error: 'Must be a number.' })
    .int('Must be a whole number.')
    .min(1, 'Must be greater than 0.')
    .max(500, 'Must be 500 or less.'),
  allow_owner_booking: z.boolean(),
  timezone: z
    .string()
    .min(1, 'Timezone is required.')
    .refine((value) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: value })
        return true
      } catch {
        return false
      }
    }, 'Select a valid timezone.'),
})

export type SettingsFormValues = z.infer<typeof settingsSchema>
