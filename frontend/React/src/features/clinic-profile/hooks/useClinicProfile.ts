import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clinicProfileService } from '../services/clinicProfile.service'
import type { UpdateProfilePayload } from '../types/clinicProfile.types'

export function useClinicProfile() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['clinic-profile'],
    queryFn: () => clinicProfileService.getProfile(),
    staleTime: 30_000,
  })

  const updateMutation = useMutation({
    mutationFn: (data: UpdateProfilePayload) => clinicProfileService.updateProfile(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['clinic-profile'], updated)
    },
  })

  const logoMutation = useMutation({
    mutationFn: (file: File) => clinicProfileService.uploadLogo(file),
    onSuccess: (updated) => {
      queryClient.setQueryData(['clinic-profile'], updated)
    },
  })

  return {
    ...query,
    updateProfile: updateMutation,
    uploadLogo: logoMutation,
  }
}
