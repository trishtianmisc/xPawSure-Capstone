import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clinicProfileService } from '../services/clinicProfile.service'
import type { UpdateOperatingHoursPayload } from '../types/clinicProfile.types'

export function useOperatingHours() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['clinic-operating-hours'],
    queryFn: () => clinicProfileService.getOperatingHours(),
    staleTime: 30_000,
  })

  const updateMutation = useMutation({
    mutationFn: (data: UpdateOperatingHoursPayload) => clinicProfileService.updateOperatingHours(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['clinic-operating-hours'], updated)
    },
  })

  return {
    ...query,
    updateOperatingHours: updateMutation,
  }
}
