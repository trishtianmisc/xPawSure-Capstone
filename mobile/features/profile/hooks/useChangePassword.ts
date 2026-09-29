import { useMutation } from '@tanstack/react-query'

import * as authService from '../../../src/services/auth'

export interface ChangePasswordPayload {
  old_password: string
  new_password: string
}

export function useChangePassword() {
  return useMutation<void, Error, ChangePasswordPayload>({
    mutationFn: ({ old_password, new_password }) =>
      authService.changePassword(old_password, new_password),
  })
}
