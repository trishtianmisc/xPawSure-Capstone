import { z } from 'zod'

export const changePasswordSchema = z
  .object({
    old_password: z.string().min(1, 'Current password is required.'),
    new_password: z
      .string()
      .min(8, 'Password must be at least 8 characters.'),
    confirm_password: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match.',
    path: ['confirm_password'],
  })
  .refine((data) => data.old_password !== data.new_password, {
    message: 'New password must be different from your current password.',
    path: ['new_password'],
  })

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
