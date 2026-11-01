import { z } from 'zod'

const phoneRegex = /^(09\d{9}|\+63\d{10})$/
const nameRegex = /^[A-Za-zÀ-ÿ\u00C0-\u024F]+([.'’ -][A-Za-zÀ-ÿ\u00C0-\u024F]+)*$/
const NAME_ERROR = 'Name may only contain letters, spaces, hyphens, apostrophes, and periods.'

const nameField = z
  .string()
  .trim()
  .min(1, 'This field is required')
  .max(100)
  .refine((val) => nameRegex.test(val), NAME_ERROR)

export const updateOwnerContactSchema = z.object({
  first_name: nameField,
  last_name: nameField,
  phone: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => !val || phoneRegex.test(val),
      'Phone must be a valid Philippine number (e.g. 09171234567)',
    ),
  address: z.string().trim().optional().or(z.literal('')),
})

export type UpdateOwnerContactFormData = z.infer<typeof updateOwnerContactSchema>
