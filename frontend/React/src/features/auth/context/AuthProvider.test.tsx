import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authService } from '../login/services/auth.service'
import type { AuthUser } from '../login/types/auth.types'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './AuthContext'

vi.mock('../login/services/auth.service', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
  },
}))

const receptionist: AuthUser = {
  id: 'receptionist-id',
  email: 'receptionist@example.com',
  role: 'RECEPTIONIST',
  first_name: 'Reception',
  last_name: 'Staff',
  must_change_password: false,
}

const veterinarian: AuthUser = {
  id: 'vet-id',
  email: 'vet@example.com',
  role: 'VETERINARIAN',
  first_name: 'Vet',
  last_name: 'Staff',
  must_change_password: false,
}

const ACCESS_KEY = 'xpawsure_access_token'
const REFRESH_KEY = 'xpawsure_refresh_token'
const USER_KEY = 'xpawsure_user'

function AuthHarness() {
  const { getAccessToken, login, logout, user } = useAuth()

  return (
    <div>
      <button
        type="button"
        onClick={() =>
          void login({
            email: receptionist.email,
            password: 'password',
            rememberMe: false,
          })
        }
      >
        Sign in for this session
      </button>
      <button
        type="button"
        onClick={() =>
          void login({
            email: receptionist.email,
            password: 'password',
            rememberMe: true,
          })
        }
      >
        Sign in and remember
      </button>
      <button type="button" onClick={() => void logout()}>
        Sign out
      </button>
      <p data-testid="user">{user?.email ?? 'none'}</p>
      <p data-testid="token">{getAccessToken() ?? 'none'}</p>
    </div>
  )
}

function renderAuthProvider() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.resetAllMocks()
  })

  it('removes stale remembered tokens when signing in for this session only', async () => {
    localStorage.setItem(ACCESS_KEY, 'stale-vet-access')
    localStorage.setItem(REFRESH_KEY, 'stale-vet-refresh')
    localStorage.setItem(USER_KEY, JSON.stringify(veterinarian))
    vi.mocked(authService.login).mockResolvedValue({
      access: 'fresh-receptionist-access',
      refresh: 'fresh-receptionist-refresh',
      user: receptionist,
    })

    renderAuthProvider()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in for this session' }))

    await waitFor(() =>
      expect(screen.getByTestId('user')).toHaveTextContent(receptionist.email),
    )

    expect(localStorage.getItem(ACCESS_KEY)).toBeNull()
    expect(localStorage.getItem(REFRESH_KEY)).toBeNull()
    expect(localStorage.getItem(USER_KEY)).toBeNull()
    expect(sessionStorage.getItem(ACCESS_KEY)).toBe('fresh-receptionist-access')
    expect(sessionStorage.getItem(REFRESH_KEY)).toBe('fresh-receptionist-refresh')
    expect(screen.getByTestId('token')).toHaveTextContent('fresh-receptionist-access')
  })

  it('removes stale session tokens when signing in with remember me', async () => {
    sessionStorage.setItem(ACCESS_KEY, 'stale-session-access')
    sessionStorage.setItem(REFRESH_KEY, 'stale-session-refresh')
    sessionStorage.setItem(USER_KEY, JSON.stringify(veterinarian))
    vi.mocked(authService.login).mockResolvedValue({
      access: 'fresh-remembered-access',
      refresh: 'fresh-remembered-refresh',
      user: receptionist,
    })

    renderAuthProvider()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in and remember' }))

    await waitFor(() =>
      expect(screen.getByTestId('user')).toHaveTextContent(receptionist.email),
    )

    expect(sessionStorage.getItem(ACCESS_KEY)).toBeNull()
    expect(sessionStorage.getItem(REFRESH_KEY)).toBeNull()
    expect(sessionStorage.getItem(USER_KEY)).toBeNull()
    expect(localStorage.getItem(ACCESS_KEY)).toBe('fresh-remembered-access')
    expect(localStorage.getItem(REFRESH_KEY)).toBe('fresh-remembered-refresh')
  })

  it('clears local auth state even when the logout request fails', async () => {
    sessionStorage.setItem(ACCESS_KEY, 'current-access')
    sessionStorage.setItem(REFRESH_KEY, 'current-refresh')
    sessionStorage.setItem(USER_KEY, JSON.stringify(receptionist))
    vi.mocked(authService.logout).mockRejectedValue(new Error('Network error'))

    renderAuthProvider()
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('none'))

    expect(authService.logout).toHaveBeenCalledWith('current-refresh')
    expect(localStorage.getItem(ACCESS_KEY)).toBeNull()
    expect(localStorage.getItem(REFRESH_KEY)).toBeNull()
    expect(localStorage.getItem(USER_KEY)).toBeNull()
    expect(sessionStorage.getItem(ACCESS_KEY)).toBeNull()
    expect(sessionStorage.getItem(REFRESH_KEY)).toBeNull()
    expect(sessionStorage.getItem(USER_KEY)).toBeNull()
    expect(screen.getByTestId('token')).toHaveTextContent('none')
  })
})
