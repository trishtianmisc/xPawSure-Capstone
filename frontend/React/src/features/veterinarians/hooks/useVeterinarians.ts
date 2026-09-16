import { useQuery } from '@tanstack/react-query'

import { veterinarianService } from '../services/veterinarian.service'

export const useVeterinarians = (params?: {
  search?: string
  status?: string
  page?: number
  page_size?: number
  sort?: string
}) => {
  return useQuery({
    queryKey: ['veterinarians', params],
    queryFn: () => veterinarianService.list(params),
  })
}
