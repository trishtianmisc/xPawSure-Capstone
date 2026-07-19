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
}
