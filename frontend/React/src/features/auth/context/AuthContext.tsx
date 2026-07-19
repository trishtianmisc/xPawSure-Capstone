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
  logout: () => void
  getAccessToken: () => string | null
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

  const logout = useCallback(() => {
    removeFromStorage(STORAGE_KEY_USER)
    removeFromStorage(STORAGE_KEY_ACCESS)
    removeFromStorage(STORAGE_KEY_REFRESH)
    setUser(null)
    navigate('/login', { replace: true })
  }, [navigate])

  const getAccessToken = useCallback((): string | null => {
    return loadFromStorage(STORAGE_KEY_ACCESS)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, login, logout, getAccessToken }),
    [user, login, logout, getAccessToken],
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
