import http from '../../../../services/http'
import type {
  AuthResponse,
  AuthUser,
  LoginCredentials,
  UpdateProfilePayload,
} from '../types/auth.types'

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

  async getProfile(): Promise<AuthUser> {
    const response = await http.get('/auth/profile/')
    return response.data
  },

  async updateProfile(data: UpdateProfilePayload): Promise<AuthUser> {
    if (!(data.profile_picture instanceof File)) {
      const response = await http.put('/auth/profile/', data)
      return response.data
    }

    const formData = new FormData()
    if (data.first_name !== undefined) formData.append('first_name', data.first_name)
    if (data.last_name !== undefined) formData.append('last_name', data.last_name)
    if (data.phone !== undefined) formData.append('phone', data.phone)
    formData.append('profile_picture', data.profile_picture)

    const response = await http.put('/auth/profile/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  async revokeAllSessions(): Promise<void> {
    await http.post('/auth/sessions/revoke-all/')
  },
}
