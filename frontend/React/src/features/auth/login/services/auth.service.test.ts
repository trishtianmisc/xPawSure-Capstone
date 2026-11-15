import { beforeEach, describe, expect, it, vi } from 'vitest'

import http from '../../../../services/http'
import type { AuthUser } from '../types/auth.types'
import { authService } from './auth.service'

vi.mock('../../../../services/http', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

const profile: AuthUser = {
  id: 'vet-1',
  email: 'vet@example.com',
  role: 'VETERINARIAN',
  first_name: 'Vera',
  last_name: 'Vet',
  phone: '09171234567',
  must_change_password: false,
  profile_picture: 'https://cdn.example.com/avatar.png',
}

describe('authService profile updates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(http.put).mockResolvedValue({
      data: profile,
    } as unknown as Awaited<ReturnType<typeof http.put>>)
  })

  it('sends profile pictures as multipart form data', async () => {
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' })

    const result = await authService.updateProfile({
      first_name: 'Vera',
      last_name: 'Vet',
      phone: '09171234567',
      profile_picture: file,
    })

    expect(result).toEqual(profile)
    const [url, body, config] = vi.mocked(http.put).mock.calls[0]
    expect(url).toBe('/auth/profile/')
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('first_name')).toBe('Vera')
    expect((body as FormData).get('last_name')).toBe('Vet')
    expect((body as FormData).get('phone')).toBe('09171234567')
    expect((body as FormData).get('profile_picture')).toBe(file)
    expect(config).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } })
  })

  it('keeps text-only updates as JSON', async () => {
    await authService.updateProfile({
      first_name: 'Vera',
      last_name: 'Vet',
      phone: '',
    })

    expect(http.put).toHaveBeenCalledWith('/auth/profile/', {
      first_name: 'Vera',
      last_name: 'Vet',
      phone: '',
    })
  })

  it('keeps profile picture removal as JSON', async () => {
    await authService.updateProfile({
      first_name: 'Vera',
      last_name: 'Vet',
      profile_picture: null,
    })

    expect(http.put).toHaveBeenCalledWith('/auth/profile/', {
      first_name: 'Vera',
      last_name: 'Vet',
      profile_picture: null,
    })
  })
})
