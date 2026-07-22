import { Navigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import type { UserRole } from '../login/types/auth.types'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate replace to="/login" />
  }

  if (user?.must_change_password) {
    return <Navigate replace to="/change-password" />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate replace to="/login" />
  }

  return <>{children}</>
}
