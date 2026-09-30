import { useMutation, useQueryClient } from '@tanstack/react-query'

import * as recordsService from '../../../src/services/records'
import type { VaccinationRecordItem, VaccinationWritePayload } from '../../../src/services/records'

export function useCreateVaccination() {
  const queryClient = useQueryClient()

  return useMutation<VaccinationRecordItem, Error, VaccinationWritePayload & { pet_id: string }>({
    mutationFn: recordsService.createVaccination,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaccinations'] })
    },
  })
}
