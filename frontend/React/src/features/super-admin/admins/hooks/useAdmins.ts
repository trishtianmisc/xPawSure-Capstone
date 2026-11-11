import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { adminService } from '../services/admin.service'

import type { AdminListParams, CreateAdminPayload } from '../types/admin.types'

export function useClinicAdmins(params?: AdminListParams) {
  return useQuery({
    queryKey: ['super-admin-admins', params],
    queryFn: () => adminService.list(params),
    staleTime: 30_000,
  })
}

export function useCreateClinicAdmin(clinicId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateAdminPayload) => adminService.create(clinicId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-admins'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin-clinic-admins', clinicId] })
    },
  })
}

export function useAdminAction() {
  const queryClient = useQueryClient()

  return useMutation<
    { email_sent?: boolean; is_active?: boolean },
    Error,
    { adminUserId: string; action: 'resend-credentials' | 'deactivate' | 'activate' }
  >({
    mutationFn: async ({ adminUserId, action }) => {
      if (action === 'resend-credentials') return adminService.resendCredentials(adminUserId)
      if (action === 'deactivate') return adminService.deactivate(adminUserId)
      return adminService.activate(adminUserId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-admins'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin-clinic-admins'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin-clinic-overview'] })
    },
  })
}
