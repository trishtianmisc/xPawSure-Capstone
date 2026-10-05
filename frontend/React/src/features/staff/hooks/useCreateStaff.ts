import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createStaff } from '../services/staff.service'
import type { CreateStaffPayload } from '../types/staff.types'

export function useCreateStaff() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateStaffPayload) => createStaff(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] })
    },
  })
}
