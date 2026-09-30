export const userRoles = [
  'SUPER_ADMIN',
  'CLINIC_ADMIN',
  'VETERINARIAN',
  'RECEPTIONIST',
] as const

export type UserRole = (typeof userRoles)[number]

export interface LoginCredentials {
  email: string
  password: string
  rememberMe: boolean
}

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  first_name: string
  last_name: string
  phone?: string
  must_change_password: boolean
}

export interface AuthResponse {
  access: string
  refresh: string
  user: AuthUser
}
