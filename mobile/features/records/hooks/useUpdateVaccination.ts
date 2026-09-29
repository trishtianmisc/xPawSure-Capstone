import { useMutation, useQueryClient } from '@tanstack/react-query'

import * as recordsService from '../../../src/services/records'
import type { VaccinationRecordItem, VaccinationWritePayload } from '../../../src/services/records'

export function useUpdateVaccination(id: string) {
  const queryClient = useQueryClient()

  return useMutation<VaccinationRecordItem, Error, VaccinationWritePayload>({
    mutationFn: (payload) => recordsService.updateVaccination(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaccinations'] })
      queryClient.invalidateQueries({ queryKey: ['vaccination', id] })
    },
  })
}
