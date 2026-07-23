import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { SessionWatcher } from './components/SessionWatcher'
import { ProtectedRoute } from './features/auth/components/ProtectedRoute'

const LoginPage = lazy(() => import('./features/auth/login/pages/LoginPage').then(m => ({ default: m.LoginPage })))
const ChangePasswordPage = lazy(() => import('./features/auth/change-password/pages/ChangePasswordPage').then(m => ({ default: m.ChangePasswordPage })))
const DashboardPage = lazy(() => import('./features/super-admin/dashboard/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const ClinicAdminDashboardPage = lazy(() => import('./features/clinic-admin/dashboard/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const VeterinarianListPage = lazy(() => import('./features/veterinarians/pages/VeterinarianListPage').then(m => ({ default: m.VeterinarianListPage })))
const ClinicListPage = lazy(() => import('./features/super-admin/clinics/pages/ClinicListPage').then(m => ({ default: m.ClinicListPage })))
const CreateClinicPage = lazy(() => import('./features/super-admin/clinics/pages/CreateClinicPage').then(m => ({ default: m.CreateClinicPage })))
const ClinicDetailPage = lazy(() => import('./features/super-admin/clinics/pages/ClinicDetailPage').then(m => ({ default: m.ClinicDetailPage })))

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
        <p className="text-sm text-stone-500">Loading…</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <>
      <SessionWatcher />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<Navigate replace to="/login" />} path="/" />
          <Route element={<LoginPage />} path="/login" />
          <Route element={<ChangePasswordPage />} path="/change-password" />
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
                <ClinicListPage />
              </ProtectedRoute>
            }
            path="/super-admin/clinics"
          />
          <Route
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <CreateClinicPage />
              </ProtectedRoute>
            }
            path="/super-admin/clinics/new"
          />
          <Route
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <ClinicDetailPage />
              </ProtectedRoute>
            }
            path="/super-admin/clinics/:id"
          />
          <Route
            element={
              <ProtectedRoute allowedRoles={['CLINIC_ADMIN']}>
                <ClinicAdminDashboardPage />
              </ProtectedRoute>
            }
            path="/clinic/dashboard"
          />
          <Route
            element={
              <ProtectedRoute allowedRoles={['CLINIC_ADMIN']}>
                <VeterinarianListPage />
              </ProtectedRoute>
            }
            path="/clinic/veterinarians"
          />
        </Routes>
      </Suspense>
    </>
  )
}

export default App
