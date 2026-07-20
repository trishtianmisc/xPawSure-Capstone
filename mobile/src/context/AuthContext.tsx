import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import * as SecureStore from 'expo-secure-store'

interface User {
  id: string
  email: string
  full_name: string
  role: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: User | null) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

const STORAGE_USER = 'xpawsure_user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_USER)
      .then((data) => {
        if (data) {
          setUser(JSON.parse(data))
        }
      })
      .finally(() => setIsLoading(false))
  }, [])

  const signOut = async () => {
    await SecureStore.deleteItemAsync(STORAGE_USER)
    await SecureStore.deleteItemAsync('xpawsure_access_token')
    await SecureStore.deleteItemAsync('xpawsure_refresh_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, setUser, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
