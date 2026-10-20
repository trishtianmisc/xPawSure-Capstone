import { createContext, useContext } from 'react'

import type { AuthUser, LoginCredentials } from '../login/types/auth.types'

export interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  getAccessToken: () => string | null
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
  getProfile: () => Promise<AuthUser>
  updateProfile: (data: { first_name?: string; last_name?: string; phone?: string }) => Promise<AuthUser>
  revokeAllSessions: () => Promise<void>
  updateUser: (updated: AuthUser) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
