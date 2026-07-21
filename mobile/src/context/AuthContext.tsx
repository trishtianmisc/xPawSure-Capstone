import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import * as authService from '../services/auth'
import { getItem, removeItem, setItem } from '../utils/storage'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: {
    email: string
    password: string
    first_name: string
    last_name: string
    phone?: string
  }) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

const STORAGE_USER = 'xpawsure_user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getItem(STORAGE_USER)
      .then((data) => {
        if (data) {
          setUser(JSON.parse(data))
        }
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const userData = await authService.login(email, password)
    await setItem(STORAGE_USER, JSON.stringify(userData))
    setUser(userData)
  }

  const register = async (data: {
    email: string
    password: string
    first_name: string
    last_name: string
    phone?: string
  }) => {
    await authService.register(data)
  }

  const signOut = async () => {
    try {
      await authService.logout()
    } catch {
      // Proceed with local cleanup even if server call fails
    }
    await removeItem(STORAGE_USER)
    await removeItem('xpawsure_access_token')
    await removeItem('xpawsure_refresh_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
