import { useEffect } from 'react'

import { useToast } from '../components/ui/ToastContext'
import { useAuth } from '../features/auth/context/AuthContext'

export function SessionWatcher() {
  const { showToast } = useToast()
  const { logout } = useAuth()

  useEffect(() => {
    function handleSessionExpired() {
      showToast('Your session has expired. Please log in again.', 'error')
      logout()
    }

    window.addEventListener('session-expired', handleSessionExpired)
    return () => window.removeEventListener('session-expired', handleSessionExpired)
  }, [showToast, logout])

  return null
}
