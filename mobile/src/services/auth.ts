import { http, loadRefreshToken, saveTokens } from './http'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
  full_name?: string
}

interface LoginResponse {
  access: string
  refresh: string
  user: User
}

interface RegisterResponse {
  id: string
  email: string
  role: string
  first_name: string
  last_name: string
}

interface RegisterPayload {
  email: string
  password: string
  first_name: string
  last_name: string
  phone?: string
}

export async function login(email: string, password: string) {
  const { data } = await http.post<LoginResponse>('/auth/login/', { email, password })
  await saveTokens(data.access, data.refresh)
  return data.user
}

export async function register(payload: RegisterPayload) {
  const { data } = await http.post<RegisterResponse>('/auth/register/', payload)
  return data
}

export async function logout() {
  try {
    const refreshToken = await loadRefreshToken()
    if (refreshToken) {
      await http.post('/auth/logout/', { refresh: refreshToken })
    }
  } catch {
    // Proceed with local cleanup even if server call fails
  }
}

export async function getProfile() {
  const { data } = await http.get<User>('/auth/profile/')
  return data
}

export async function updateProfile(payload: Partial<Pick<User, 'first_name' | 'last_name'>> & { phone?: string }) {
  const { data } = await http.put<User>('/auth/profile/', payload)
  return data
}

export async function changePassword(oldPassword: string, newPassword: string) {
  await http.post('/auth/change-password/', {
    old_password: oldPassword,
    new_password: newPassword,
  })
}

export async function revokeAllSessions() {
  await http.post('/auth/sessions/revoke-all/')
}
