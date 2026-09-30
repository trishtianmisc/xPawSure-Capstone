import http from '../../../../services/http'
import type { PublicPet } from '../types/pet.types'

export async function getPublicPet(qrCode: string): Promise<PublicPet> {
  const { data } = await http.get(`/pets/public/${encodeURIComponent(qrCode)}/`)
  return data
}
