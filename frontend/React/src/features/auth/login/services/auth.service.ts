import type { AuthResponse, LoginCredentials } from '../types/auth.types'

const API_BASE = '/api'

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    })

    if (!response.ok) {
      const body = await response.json().catch(() => null)
      const message =
        body?.non_field_errors?.[0] ??
        body?.detail ??
        body?.message ??
        'Invalid email or password.'
      throw new Error(message)
    }

    return response.json()
  },
}
