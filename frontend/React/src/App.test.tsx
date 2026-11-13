import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authState = vi.hoisted(() => ({
  current: {
    isAuthenticated: false,
    user: null as { role: string; must_change_password: boolean } | null,
  },
}))

vi.mock('./features/auth/context/AuthContext', () => ({
  useAuth: () => authState.current,
}))
vi.mock('./components/SessionWatcher', () => ({
  SessionWatcher: () => null,
}))
vi.mock('./features/auth/login/pages/LoginPage', () => ({
  LoginPage: () => <div>Login screen</div>,
}))
vi.mock('./features/auth/change-password/pages/ChangePasswordPage', () => ({
  ChangePasswordPage: () => <div>Change password screen</div>,
}))
vi.mock('./features/veterinarian/dashboard/components/VetDashboardLayout', () => ({
  VetDashboardLayout: () => <div>Vet layout</div>,
}))
vi.mock('./features/veterinarian/dashboard/pages/DashboardPage', () => ({
  DashboardPage: () => <div>Vet dashboard</div>,
}))

import App from './App'

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('veterinarian route guard', () => {
  beforeEach(() => {
    authState.current = { isAuthenticated: false, user: null }
  })

  it('redirects unauthenticated users to login', async () => {
    renderApp('/veterinarian/dashboard')

    expect(await screen.findByText('Login screen')).toBeInTheDocument()
    expect(screen.queryByText('Vet layout')).not.toBeInTheDocument()
  })

  it('redirects authenticated users with another role to login', async () => {
    authState.current = {
      isAuthenticated: true,
      user: { role: 'RECEPTIONIST', must_change_password: false },
    }

    renderApp('/veterinarian/dashboard')

    expect(await screen.findByText('Login screen')).toBeInTheDocument()
    expect(screen.queryByText('Vet layout')).not.toBeInTheDocument()
  })

  it('keeps first-login veterinarians on the change-password screen', async () => {
    authState.current = {
      isAuthenticated: true,
      user: { role: 'VETERINARIAN', must_change_password: true },
    }

    renderApp('/veterinarian/dashboard')

    expect(await screen.findByText('Change password screen')).toBeInTheDocument()
    expect(screen.queryByText('Vet layout')).not.toBeInTheDocument()
  })

  it('renders the vet layout for veterinarians', async () => {
    authState.current = {
      isAuthenticated: true,
      user: { role: 'VETERINARIAN', must_change_password: false },
    }

    renderApp('/veterinarian/dashboard')

    expect(await screen.findByText('Vet layout')).toBeInTheDocument()
  })
})
