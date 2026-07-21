import { http } from './http'

interface Breed {
  id: string
  name: string
}

interface PetCreatePayload {
  name: string
  sex: 'MALE' | 'FEMALE'
  breed_id: string
  date_of_birth?: string
  weight?: string
  color?: string
  microchip_number?: string
  profile_picture?: string
}

interface Pet {
  id: string
  name: string
  sex: string
  breed_id: string
  breed_name: string
  date_of_birth: string | null
  weight: string | null
  color: string | null
  microchip_number: string | null
  profile_picture: string | null
  created_at: string
}

export async function getBreeds(): Promise<Breed[]> {
  const { data } = await http.get('/breeds/')
  return data
}

export async function createPet(payload: PetCreatePayload): Promise<Pet> {
  const { data } = await http.post('/pets/', payload)
  return data
}
