import http from '../../../../services/http'
import type { AuthResponse, LoginCredentials } from '../types/auth.types'

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await http.post('/auth/login/', {
      email: credentials.email,
      password: credentials.password,
    })
    return response.data
  },

  async logout(refreshToken: string): Promise<void> {
    try {
      await http.post('/auth/logout/', { refresh: refreshToken })
    } catch {
      // Proceed with local cleanup even if server call fails
    }
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await http.post('/auth/change-password/', {
      old_password: oldPassword,
      new_password: newPassword,
    })
  },

  async getProfile() {
    const response = await http.get('/auth/profile/')
    return response.data
  },

  async updateProfile(data: { first_name?: string; last_name?: string; phone?: string }) {
    const response = await http.put('/auth/profile/', data)
    return response.data
  },

  async revokeAllSessions(): Promise<void> {
    await http.post('/auth/sessions/revoke-all/')
  },
}
