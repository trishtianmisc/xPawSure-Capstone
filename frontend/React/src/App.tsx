import { Navigate, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from './features/auth/components/ProtectedRoute'
import { CreateClinicPage } from './features/super-admin/clinics'
import { DashboardPage } from './features/super-admin/dashboard'
import { LoginPage } from './features/auth/login'

function App() {
  return (
    <Routes>
      <Route element={<Navigate replace to="/login" />} path="/" />
      <Route element={<LoginPage />} path="/login" />
      <Route
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <DashboardPage />
          </ProtectedRoute>
        }
        path="/super-admin/dashboard"
      />
      <Route
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <CreateClinicPage />
          </ProtectedRoute>
        }
        path="/super-admin/clinics/new"
      />
    </Routes>
  )
}

export default App
