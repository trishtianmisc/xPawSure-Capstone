import { http, loadRefreshToken, saveTokens } from './http'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  role: string
  full_name?: string
  clinic_name?: string | null
  position?: string | null
  license_number?: string | null
  license_expiration_date?: string | null
  profile_picture?: string | null
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

export interface UpdateProfilePayload {
  first_name?: string
  last_name?: string
  phone?: string
  profile_picture?: string | null
}

export async function updateProfile(payload: UpdateProfilePayload) {
  if (typeof payload.profile_picture === 'string') {
    const form = new FormData()
    if (payload.first_name !== undefined) form.append('first_name', payload.first_name)
    if (payload.last_name !== undefined) form.append('last_name', payload.last_name)
    if (payload.phone !== undefined) form.append('phone', payload.phone)
    form.append('profile_picture', {
      uri: payload.profile_picture,
      name: 'profile.jpg',
      type: 'image/jpeg',
    } as unknown as Blob)

    const { data } = await http.put<User>('/auth/profile/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  }

  const body: UpdateProfilePayload = {}
  if (payload.first_name !== undefined) body.first_name = payload.first_name
  if (payload.last_name !== undefined) body.last_name = payload.last_name
  if (payload.phone !== undefined) body.phone = payload.phone
  if (payload.profile_picture === null) body.profile_picture = null

  const { data } = await http.put<User>('/auth/profile/', body)
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
