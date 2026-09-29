import { useMutation, useQueryClient } from '@tanstack/react-query'

import * as recordsService from '../../../src/services/records'

export function useDeleteVaccination() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: recordsService.deleteVaccination,
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: ['vaccination', id] })
      queryClient.invalidateQueries({ queryKey: ['vaccinations'] })
    },
  })
}
