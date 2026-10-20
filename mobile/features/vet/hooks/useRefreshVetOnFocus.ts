import { useQueryClient } from '@tanstack/react-query'
import { useFocusEffect } from 'expo-router'
import { useCallback } from 'react'

const VET_QUERY_KEYS = {
  dashboard: ['vet', 'dashboard'],
  appointments: ['vet', 'appointments'],
  appointment: ['vet', 'appointment'],
} as const

export type VetRefreshScope = keyof typeof VET_QUERY_KEYS

export function useRefreshVetOnFocus(scope: VetRefreshScope) {
  const queryClient = useQueryClient()

  useFocusEffect(
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: VET_QUERY_KEYS[scope] })
    }, [queryClient, scope]),
  )
}
