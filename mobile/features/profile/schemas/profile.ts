import { z } from 'zod'

export const profileSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(150, 'First name must be 150 characters or less'),
  last_name: z.string().min(1, 'Last name is required').max(150, 'Last name must be 150 characters or less'),
  phone: z.string().max(30, 'Phone must be 30 characters or less').optional(),
  address: z.string().max(500, 'Address must be 500 characters or less').optional(),
  profile_picture: z.string().optional(),
})

export type ProfileFormValues = z.infer<typeof profileSchema>

export const changePasswordSchema = z
  .object({
    old_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>
