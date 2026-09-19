import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'

import { authService } from '../login/services/auth.service'
import type { AuthUser, LoginCredentials } from '../login/types/auth.types'

interface AuthContextValue {
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

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY_USER = 'xpawsure_user'
const STORAGE_KEY_ACCESS = 'xpawsure_access_token'
const STORAGE_KEY_REFRESH = 'xpawsure_refresh_token'

function getPostLoginPath(user: AuthUser): string {
  if (user.must_change_password) {
    return '/change-password'
  }

  switch (user.role) {
    case 'SUPER_ADMIN':
      return '/super-admin/dashboard'
    case 'CLINIC_ADMIN':
      return '/clinic/dashboard'
    case 'VETERINARIAN':
      return '/veterinarian/dashboard'
    case 'RECEPTIONIST':
      return '/receptionist/dashboard'
  }
}

function loadFromStorage(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function saveToStorage(key: string, value: string, persistent: boolean): void {
  try {
    if (persistent) {
      localStorage.setItem(key, value)
    } else {
      sessionStorage.setItem(key, value)
    }
  } catch {
    /* storage unavailable */
  }
}

function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  } catch {
    /* storage unavailable */
  }
}

function clearAuthStorage(): void {
  removeFromStorage(STORAGE_KEY_USER)
  removeFromStorage(STORAGE_KEY_ACCESS)
  removeFromStorage(STORAGE_KEY_REFRESH)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_USER) ?? sessionStorage.getItem(STORAGE_KEY_USER)
      return raw ? (JSON.parse(raw) as AuthUser) : null
    } catch {
      return null
    }
  })

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const response = await authService.login(credentials)

      saveToStorage(STORAGE_KEY_ACCESS, response.access, credentials.rememberMe)
      saveToStorage(STORAGE_KEY_REFRESH, response.refresh, credentials.rememberMe)
      saveToStorage(STORAGE_KEY_USER, JSON.stringify(response.user), credentials.rememberMe)

      setUser(response.user)
      navigate(getPostLoginPath(response.user), { replace: true })
    },
    [navigate],
  )

  const logout = useCallback(async () => {
    const refreshToken = loadFromStorage(STORAGE_KEY_REFRESH)
    if (refreshToken) {
      await authService.logout(refreshToken)
    }
    clearAuthStorage()
    setUser(null)
    navigate('/login', { replace: true })
  }, [navigate])

  const getAccessToken = useCallback((): string | null => {
    return loadFromStorage(STORAGE_KEY_ACCESS)
  }, [])

  const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    await authService.changePassword(oldPassword, newPassword)
  }, [])

  const getProfile = useCallback(async () => {
    const data = await authService.getProfile()
    const merged = { ...user, ...data } as AuthUser
    setUser(merged)
    try {
      const raw = localStorage.getItem(STORAGE_KEY_USER)
      if (raw) localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(merged))
      else sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(merged))
    } catch { /* storage unavailable */ }
    return data
  }, [user])

  const updateProfile = useCallback(async (data: { first_name?: string; last_name?: string; phone?: string }) => {
    const result = await authService.updateProfile(data)
    const merged = { ...user, ...result } as AuthUser
    setUser(merged)
    try {
      const raw = localStorage.getItem(STORAGE_KEY_USER)
      if (raw) localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(merged))
      else sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(merged))
    } catch { /* storage unavailable */ }
    return result
  }, [user])

  const revokeAllSessions = useCallback(async () => {
    await authService.revokeAllSessions()
  }, [])

  const updateUser = useCallback((updated: AuthUser) => {
    setUser(updated)
    try {
      const raw = localStorage.getItem(STORAGE_KEY_USER)
      if (raw) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated))
      } else {
        sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated))
      }
    } catch {
      /* storage unavailable */
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      login,
      logout,
      getAccessToken,
      changePassword,
      getProfile,
      updateProfile,
      revokeAllSessions,
      updateUser,
    }),
    [user, login, logout, getAccessToken, changePassword, getProfile, updateProfile, revokeAllSessions, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
