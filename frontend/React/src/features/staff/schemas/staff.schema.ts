import { z } from 'zod'

export const staffRoleSchema = z.enum(['VETERINARIAN', 'RECEPTIONIST'], {
  required_error: 'Please select a role',
})

export const createVeterinarianSchema = z.object({
  email: z.string().email('Invalid email address'),
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().max(20).optional().or(z.literal('')),
  role: z.literal('VETERINARIAN'),
  license_number: z.string().min(1, 'License number is required for veterinarians').max(100),
  license_expiration_date: z.string().min(1, 'License expiration date is required'),
})

export const createReceptionistSchema = z.object({
  email: z.string().email('Invalid email address'),
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().max(20).optional().or(z.literal('')),
  role: z.literal('RECEPTIONIST'),
  license_number: z.string().optional().or(z.literal('')),
  license_expiration_date: z.string().optional().or(z.literal('')),
})
