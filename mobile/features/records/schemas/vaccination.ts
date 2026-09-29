import { z } from 'zod'

import type { VaccinationWritePayload } from '../../../src/services/records'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function localToday(): string {
  const d = new Date()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

export const vaccinationSchema = z
  .object({
    pet_id: z.string().min(1, 'Select a pet'),
    name: z.string().trim().min(1, 'Vaccine name is required').max(255, 'Vaccine name must be 255 characters or less'),
    brand: z.string().optional(),
    batch_no: z.string().optional(),
    dose: z.string().trim().min(1, 'Dose is required').max(100, 'Dose must be 100 characters or less'),
    route: z.enum(['SUBCUTANEOUS', 'INTRAMUSCULAR', 'INTRAVENOUS', 'ORAL', 'OTHER']),
    date_given: z
      .string()
      .min(1, 'Date given is required')
      .regex(ISO_DATE, 'Use YYYY-MM-DD format')
      .refine((value) => value <= localToday(), 'Date cannot be in the future'),
    next_due: z
      .string()
      .optional()
      .refine((value) => !value || ISO_DATE.test(value), 'Use YYYY-MM-DD format'),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.next_due && data.next_due < data.date_given) {
      ctx.addIssue({
        code: 'custom',
        message: 'Next due must be on or after the vaccination date',
        path: ['next_due'],
      })
    }
  })

export type VaccinationFormValues = z.infer<typeof vaccinationSchema>

export function toVaccinationPayload(
  values: VaccinationFormValues,
): VaccinationWritePayload & { pet_id: string } {
  return {
    pet_id: values.pet_id,
    name: values.name,
    brand: values.brand?.trim() || null,
    batch_no: values.batch_no?.trim() || null,
    dose: values.dose,
    route: values.route,
    date_given: values.date_given,
    next_due: values.next_due || null,
    notes: values.notes?.trim() || null,
  }
}
