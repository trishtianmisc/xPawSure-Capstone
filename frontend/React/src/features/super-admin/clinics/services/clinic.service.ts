import { useAuth } from '../../../auth/context/AuthContext'

export interface CreateClinicPayload {
  name: string
  email: string
  phone: string
  address: string
  license_number: string
}

export interface ClinicResponse {
  id: string
  name: string
  email: string
  phone: string
  address: string
  license_number: string
  status: string
  created_at: string
}

const API_BASE = '/api'

function getHeaders(): HeadersInit {
  const token = (() => {
    try {
      return localStorage.getItem('xpawsure_access_token') ?? sessionStorage.getItem('xpawsure_access_token')
    } catch {
      return null
    }
  })()

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export const clinicService = {
  async create(data: CreateClinicPayload): Promise<ClinicResponse> {
    const response = await fetch(`${API_BASE}/clinics/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const body = await response.json().catch(() => null)
      const message =
        body?.non_field_errors?.[0] ??
        body?.detail ??
        body?.message ??
        'Failed to create clinic.'
      throw new Error(message)
    }

    return response.json()
  },
}
