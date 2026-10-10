import http from '../../../../services/http'

export interface VolumePoint {
  date: string
  count: number
}

export interface VeterinarianOption {
  id: string
  first_name: string
  last_name: string
}

export interface VolumeQueryParams {
  date_from?: string
  date_to?: string
  vet_id?: string
  status?: string
}

export async function getAppointmentVolume(
  params: VolumeQueryParams,
): Promise<VolumePoint[]> {
  const { data } = await http.get<{ results: VolumePoint[] }>(
    '/appointments/volume/',
    { params },
  )
  return data.results
}

export async function listVeterinarians(): Promise<VeterinarianOption[]> {
  const { data } = await http.get<{ results: VeterinarianOption[] }>(
    '/veterinarians/',
    { params: { page_size: 100 } },
  )
  return data.results
}
