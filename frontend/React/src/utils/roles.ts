import type { UserRole } from '../features/auth/login/types/auth.types'

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  CLINIC_ADMIN: 'Clinic Admin',
  VETERINARIAN: 'Veterinarian',
  RECEPTIONIST: 'Receptionist',
}

export function roleLabel(role?: UserRole): string {
  if (role && ROLE_LABELS[role]) return ROLE_LABELS[role]
  return role ?? ''
}
