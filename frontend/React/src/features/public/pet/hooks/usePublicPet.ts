import { useQuery } from '@tanstack/react-query'

import { getPublicPet } from '../services/publicPet.service'

export function usePublicPet(qrCode: string) {
  return useQuery({
    queryKey: ['public', 'pet', qrCode],
    queryFn: () => getPublicPet(qrCode),
    enabled: !!qrCode,
    retry: false,
  })
}
