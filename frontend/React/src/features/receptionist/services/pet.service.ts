import http from '../../../services/http'
import type {
  CreatePetPayload,
  Pet,
  PetListResponse,
  UpdatePetPayload,
} from '../types/receptionist.types'

export async function listPets(params: {
  search?: string
  owner_id?: string
  page?: number
  page_size?: number
}): Promise<PetListResponse> {
  const { data } = await http.get('/receptionist/pets/', { params })
  return data
}

export async function getPetDetail(petId: string): Promise<Pet> {
  const { data } = await http.get(`/receptionist/pets/${petId}/`)
  return data
}

export async function createPet(payload: CreatePetPayload): Promise<Pet> {
  const { data } = await http.post('/receptionist/pets/', payload)
  return data
}

export async function updatePet(
  petId: string,
  payload: UpdatePetPayload,
): Promise<Pet> {
  const { data } = await http.patch(`/receptionist/pets/${petId}/`, payload)
  return data
}
