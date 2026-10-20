import { useMutation } from '@tanstack/react-query'

import { useAuth } from '../../context/AuthContext'
import { apiErrorMessage } from '../../../../utils/error'
import type { LoginCredentials } from '../types/auth.types'

export const useLogin = () => {
  const { login } = useAuth()

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => login(credentials),
  })

  const submitLogin = async (credentials: LoginCredentials) => {
    await loginMutation.mutateAsync(credentials)
  }

  return {
    submitLogin,
    isSubmitting: loginMutation.isPending,
    errorMessage: loginMutation.error
      ? apiErrorMessage(loginMutation.error)
      : null,
  }
}
