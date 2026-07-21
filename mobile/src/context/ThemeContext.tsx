import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { getItem, setItem } from '../utils/storage'

export interface AppColors {
  bg: string
  surface: string
  surfaceAlt: string
  text: string
  textSecondary: string
  textMuted: string
  inverse: string
  primary: string
  primaryDark: string
  primaryLight: string
  border: string
  borderLight: string
  tabBg: string
  tabBorder: string
  tabActive: string
  tabInactive: string
  iconBg: string
  iconColor: string
  error: string
  errorBg: string
  link: string
  linkMuted: string
}

const lightColors: AppColors = {
  bg: '#FFFCF8',
  surface: '#FFFFFF',
  surfaceAlt: '#FEF8F3',
  text: '#1A0E08',
  textSecondary: '#806C60',
  textMuted: '#A89A91',
  inverse: '#FFFFFF',
  primary: '#8B4324',
  primaryDark: '#4D2515',
  primaryLight: '#F8E6D0',
  border: '#E5DFDA',
  borderLight: '#E0C0A8',
  tabBg: '#FFFFFF',
  tabBorder: '#F0E4DB',
  tabActive: '#A5522C',
  tabInactive: '#8D7466',
  iconBg: '#F4E3D6',
  iconColor: '#8E4A2B',
  error: '#C0392B',
  errorBg: '#C0392B',
  link: '#8B4324',
  linkMuted: '#5A4539',
}

const darkColors: AppColors = {
  bg: '#121212',
  surface: '#1E1E1E',
  surfaceAlt: '#252525',
  text: '#F0F0F0',
  textSecondary: '#A0A0A0',
  textMuted: '#707070',
  inverse: '#FFFFFF',
  primary: '#D48350',
  primaryDark: '#8B4324',
  primaryLight: '#3A2518',
  border: '#333333',
  borderLight: '#444444',
  tabBg: '#1A1A1A',
  tabBorder: '#333333',
  tabActive: '#D48350',
  tabInactive: '#888888',
  iconBg: '#2A2A2A',
  iconColor: '#D48350',
  error: '#CF6679',
  errorBg: '#4A2020',
  link: '#D48350',
  linkMuted: '#AAAAAA',
}

interface ThemeContextType {
  theme: 'light' | 'dark'
  toggleTheme: () => void
  setTheme: (theme: 'light' | 'dark') => void
  isDark: boolean
  colors: AppColors
}

const ThemeContext = createContext<ThemeContextType | null>(null)

const STORAGE_KEY = 'xpawsure_theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    getItem(STORAGE_KEY).then((value) => {
      if (value === 'dark' || value === 'light') {
        setThemeState(value)
      }
    })
  }, [])

  const setTheme = useCallback((t: 'light' | 'dark') => {
    setThemeState(t)
    setItem(STORAGE_KEY, t)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light'
      setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      setTheme,
      isDark: theme === 'dark',
      colors: theme === 'dark' ? darkColors : lightColors,
    }),
    [theme, toggleTheme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
