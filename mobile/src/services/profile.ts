import { http } from './http'

export interface OwnerProfile {
  id: string
  user: {
    id: string
    email: string
    full_name: string
    phone: string | null
  }
  clinic: { id: string; name: string } | null
  address: string
  profile_picture: string
}

export interface UpdateOwnerProfilePayload {
  address?: string
  profile_picture?: string | null
}

export async function getOwnerProfile(): Promise<OwnerProfile> {
  const { data } = await http.get<OwnerProfile>('/owner/profile/')
  return data
}

export async function updateOwnerProfile(payload: UpdateOwnerProfilePayload): Promise<OwnerProfile> {
  if (typeof payload.profile_picture === 'string') {
    const form = new FormData()
    if (payload.address !== undefined) form.append('address', payload.address)
    form.append('profile_picture', {
      uri: payload.profile_picture,
      name: 'avatar.jpg',
      type: 'image/jpeg',
    } as unknown as Blob)

    const { data } = await http.put<OwnerProfile>('/owner/profile/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  }

  const body: UpdateOwnerProfilePayload = {}
  if (payload.address !== undefined) body.address = payload.address
  if (payload.profile_picture === null) body.profile_picture = null

  const { data } = await http.put<OwnerProfile>('/owner/profile/', body)
  return data
}
