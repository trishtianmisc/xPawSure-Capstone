import { z } from 'zod'

import type { VaccinationWritePayload } from '../../../src/services/records'
import { manilaDateKey } from '../../../src/utils/datetime'
import { isValidIsoDate } from '../../pet/lib/date'

export function localToday(): string {
  return manilaDateKey()
}

export const vaccinationSchema = z
  .object({
    pet_id: z.string().min(1, 'Select a pet'),
    name: z.string().trim().min(1, 'Vaccine name is required').max(255, 'Vaccine name must be 255 characters or less'),
    brand: z.string().optional(),
    batch_no: z.string().optional(),
    veterinarian: z.string().max(255, 'Veterinarian name must be 255 characters or less').optional(),
    series_id: z.string().uuid().optional(),
    date_given: z
      .string()
      .min(1, 'Date given is required')
      .refine(isValidIsoDate, 'Select a valid date')
      .refine((value) => value <= manilaDateKey(), 'Date cannot be in the future'),
    next_due: z
      .string()
      .optional()
      .refine((value) => !value || isValidIsoDate(value), 'Select a valid date'),
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
    veterinarian: values.veterinarian?.trim() || null,
    ...(values.series_id ? { series_id: values.series_id } : {}),
    date_given: values.date_given,
    next_due: values.next_due || null,
  }
}
