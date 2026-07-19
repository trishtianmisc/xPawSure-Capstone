import type { FieldErrors, Resolver } from 'react-hook-form'
import { z } from 'zod'

import type { LoginCredentials } from '../types/auth.types'

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email address is required.')
    .email('Enter a valid email address.'),
  password: z
    .string()
    .min(1, 'Password is required.')
    .min(8, 'Password must be at least 8 characters.'),
  rememberMe: z.boolean(),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const loginResolver: Resolver<LoginFormValues> = async (values) => {
  const result = loginSchema.safeParse(values)

  if (result.success) {
    return {
      values: result.data,
      errors: {},
    }
  }

  const errors = result.error.issues.reduce<FieldErrors<LoginFormValues>>(
    (fieldErrors, issue) => {
      const fieldName = issue.path[0]

      if (typeof fieldName === 'string') {
        fieldErrors[fieldName as keyof LoginCredentials] = {
          type: issue.code,
          message: issue.message,
        }
      }

      return fieldErrors
    },
    {},
  )

  return {
    values: {},
    errors,
  }
}
