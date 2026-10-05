import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clinicProfileService } from '../services/clinicProfile.service'
import type { UpdateSettingsPayload } from '../types/clinicProfile.types'

export function useClinicSettings() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['clinic-settings'],
    queryFn: () => clinicProfileService.getSettings(),
    staleTime: 30_000,
  })

  const updateMutation = useMutation({
    mutationFn: (data: UpdateSettingsPayload) => clinicProfileService.updateSettings(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['clinic-settings'], updated)
    },
  })

  return {
    ...query,
    updateSettings: updateMutation,
  }
}
