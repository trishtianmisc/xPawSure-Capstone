import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useFocusEffect } from 'expo-router'
import { useCallback } from 'react'

import { getScreening } from '../../../src/services/screening'

export function useScreening(id: string | undefined) {
  const queryClient = useQueryClient()
  useFocusEffect(useCallback(() => {
    if (id) void queryClient.invalidateQueries({ queryKey: ['screening', id] })
  }, [id, queryClient]))

  return useQuery({
    queryKey: ['screening', id],
    queryFn: () => getScreening(id!),
    enabled: !!id,
  })
}
