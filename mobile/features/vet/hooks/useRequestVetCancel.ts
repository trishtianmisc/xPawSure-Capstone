import { useMutation, useQueryClient } from '@tanstack/react-query'

import * as vetService from '../../../src/services/vet'

export function useRequestVetCancel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ aptId, reason }: { aptId: string; reason: string }) =>
      vetService.requestVetCancel(aptId, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vet'] }),
  })
}
