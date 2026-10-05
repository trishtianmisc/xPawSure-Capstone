import { useMutation, useQueryClient } from '@tanstack/react-query'
import { staffAction } from '../services/staff.service'

export function useStaffAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      staffAction(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] })
    },
  })
}
