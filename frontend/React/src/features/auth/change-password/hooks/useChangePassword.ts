import { useMutation } from '@tanstack/react-query'

import { authService } from '../../login/services/auth.service'
import { useAuth } from '../../context/AuthContext'

export function useChangePassword() {
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      oldPassword,
      newPassword,
    }: {
      oldPassword: string
      newPassword: string
    }) => {
      await authService.changePassword(oldPassword, newPassword)
    },
    onSuccess: () => {
      if (user) {
        const updated = { ...user, must_change_password: false }
        try {
          const raw = localStorage.getItem('xpawsure_user') ?? sessionStorage.getItem('xpawsure_user')
          const storage = raw ? (localStorage.getItem('xpawsure_user') ? 'localStorage' : 'sessionStorage') : null
          if (storage) {
            window[storage as 'localStorage' | 'sessionStorage'].setItem('xpawsure_user', JSON.stringify(updated))
          }
        } catch {
          /* ignore */
        }
      }
    },
  })
}
