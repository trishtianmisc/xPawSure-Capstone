import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  blockRemainingSlots,
  generateSlots,
  getAvailableSlots,
  getSchedule,
  getVetScheduleList,
  getVetsForDate,
  updateSlotStatus,
} from '../services/slot.service'

export function useAvailableSlots(vetId: string, date: string) {
  return useQuery({
    queryKey: ['receptionist', 'slots', vetId, date],
    queryFn: () => getAvailableSlots(vetId, date),
    enabled: !!vetId && !!date,
  })
}

export function useVetsForDate(date: string) {
  return useQuery({
    queryKey: ['receptionist', 'vets', date],
    queryFn: () => getVetsForDate(date),
    enabled: !!date,
  })
}

export function useSchedule(startDate: string, endDate: string, vetId?: string) {
  return useQuery({
    queryKey: ['receptionist', 'schedule', startDate, endDate, vetId],
    queryFn: () => getSchedule(startDate, endDate, vetId),
    enabled: !!startDate && !!endDate,
    staleTime: 30_000,
  })
}

export function useVetScheduleList() {
  return useQuery({
    queryKey: ['receptionist', 'schedule-vet-list'],
    queryFn: () => getVetScheduleList(),
    staleTime: 30_000,
  })
}

export function useGenerateSlots() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: generateSlots,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'schedule'] })
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'schedule-vet-list'] })
    },
  })
}

export function useUpdateSlotStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ slotId, status }: { slotId: string; status: 'AVAILABLE' | 'BLOCKED' }) =>
      updateSlotStatus(slotId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'schedule'] })
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'schedule-vet-list'] })
    },
  })
}

export function useBlockRemainingSlots() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ vetId, date }: { vetId: string; date: string }) =>
      blockRemainingSlots(vetId, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'schedule'] })
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'schedule-vet-list'] })
    },
  })
}
