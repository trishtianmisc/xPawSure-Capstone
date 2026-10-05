import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateStaff } from '../services/staff.service'
import type { UpdateStaffPayload } from '../types/staff.types'

export function useUpdateStaff() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateStaffPayload }) =>
      updateStaff(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] })
    },
  })
}
