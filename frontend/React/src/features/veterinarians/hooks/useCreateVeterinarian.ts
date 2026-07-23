import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useToast } from '../../../components/ui/ToastContext'
import { veterinarianService } from '../services/veterinarian.service'
import type { CreateVeterinarianPayload } from '../types/veterinarian.types'

export const useCreateVeterinarian = (onSuccess?: () => void) => {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const mutation = useMutation({
    mutationFn: (payload: CreateVeterinarianPayload) => veterinarianService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['veterinarians'] })
      showToast('Veterinarian created successfully', 'success')
      onSuccess?.()
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Failed to create veterinarian'
      showToast(message, 'error')
    },
  })

  return {
    createVeterinarian: mutation.mutateAsync,
    isSubmitting: mutation.isPending,
    error: mutation.error,
  }
}
