import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { SessionWatcher } from './components/SessionWatcher'
import { ProtectedRoute } from './features/auth/components/ProtectedRoute'

const LoginPage = lazy(() => import('./features/auth/login/pages/LoginPage').then(m => ({ default: m.LoginPage })))
const ChangePasswordPage = lazy(() => import('./features/auth/change-password/pages/ChangePasswordPage').then(m => ({ default: m.ChangePasswordPage })))
const DashboardPage = lazy(() => import('./features/super-admin/dashboard/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const ClinicAdminDashboardPage = lazy(() => import('./features/clinic-admin/dashboard/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const ClinicProfilePage = lazy(() => import('./features/clinic-profile/pages/ClinicProfilePage').then(m => ({ default: m.ClinicProfilePage })))
const StaffListPage = lazy(() => import('./features/staff/pages/StaffListPage').then(m => ({ default: m.StaffListPage })))
const StaffDetailPage = lazy(() => import('./features/staff/pages/StaffDetailPage').then(m => ({ default: m.StaffDetailPage })))
const ClinicListPage = lazy(() => import('./features/super-admin/clinics/pages/ClinicListPage').then(m => ({ default: m.ClinicListPage })))
const CreateClinicPage = lazy(() => import('./features/super-admin/clinics/pages/CreateClinicPage').then(m => ({ default: m.CreateClinicPage })))
const ClinicDetailPage = lazy(() => import('./features/super-admin/clinics/pages/ClinicDetailPage').then(m => ({ default: m.ClinicDetailPage })))
const ClinicAdminLayout = lazy(() => import('./features/clinic-admin/components/ClinicAdminLayout').then(m => ({ default: m.ClinicAdminLayout })))
const ReceptionistLayout = lazy(() => import('./features/receptionist/components/ReceptionistLayout').then(m => ({ default: m.ReceptionistLayout })))
const ReceptionistDashboardPage = lazy(() => import('./features/receptionist/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const ReceptionistAppointmentsPage = lazy(() => import('./features/receptionist/pages/AppointmentsPage').then(m => ({ default: m.AppointmentsPage })))
const ReceptionistAppointmentDetailPage = lazy(() => import('./features/receptionist/pages/AppointmentDetailPage').then(m => ({ default: m.AppointmentDetailPage })))
const ReceptionistCreateAppointmentPage = lazy(() => import('./features/receptionist/pages/CreateAppointmentPage').then(m => ({ default: m.CreateAppointmentPage })))
const ReceptionistOwnersPage = lazy(() => import('./features/receptionist/pages/OwnersPage').then(m => ({ default: m.OwnersPage })))
const ReceptionistOwnerDetailPage = lazy(() => import('./features/receptionist/pages/OwnerDetailPage').then(m => ({ default: m.OwnerDetailPage })))
const ReceptionistPetsPage = lazy(() => import('./features/receptionist/pages/PetsPage').then(m => ({ default: m.PetsPage })))
const ReceptionistPetDetailPage = lazy(() => import('./features/receptionist/pages/PetDetailPage').then(m => ({ default: m.PetDetailPage })))
const ReceptionistSchedulePage = lazy(() => import('./features/receptionist/pages/SchedulePage').then(m => ({ default: m.SchedulePage })))
const ReceptionistVetScheduleListPage = lazy(() => import('./features/receptionist/pages/VetScheduleListPage').then(m => ({ default: m.VetScheduleListPage })))
const ReceptionistProfilePage = lazy(() => import('./features/receptionist/pages/ProfilePage').then(m => ({ default: m.ProfilePage })))
const VetDashboardLayout = lazy(() => import('./features/veterinarian/dashboard/components/VetDashboardLayout').then(m => ({ default: m.VetDashboardLayout })))
const VetDashboardPage = lazy(() => import('./features/veterinarian/dashboard/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const VetConsultationsPage = lazy(() => import('./features/veterinarian/dashboard/pages/ConsultationsPage').then(m => ({ default: m.ConsultationsPage })))
const VetConsultationFormPage = lazy(() => import('./features/veterinarian/dashboard/pages/ConsultationFormPage').then(m => ({ default: m.ConsultationFormPage })))
const VetPrescriptionPage = lazy(() => import('./features/veterinarian/dashboard/pages/PrescriptionPage').then(m => ({ default: m.PrescriptionPage })))
const VetSchedulePage = lazy(() => import('./features/veterinarian/dashboard/pages/SchedulePage').then(m => ({ default: m.SchedulePage })))
const VetProfilePage = lazy(() => import('./features/veterinarian/dashboard/pages/ProfilePage').then(m => ({ default: m.ProfilePage })))

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
  path="/clinic"
  element={
    <ProtectedRoute allowedRoles={['CLINIC_ADMIN']}>
      <ClinicAdminLayout />
    </ProtectedRoute>
  }
>
  <Route index element={<ClinicAdminDashboardPage />} />
  <Route path="dashboard" element={<ClinicAdminDashboardPage />} />
  <Route path="staff" element={<StaffListPage />} />
  <Route path="staff/:id" element={<StaffDetailPage />} />
  <Route path="profile" element={<ClinicProfilePage />} />
</Route>

<Route
  path="/super-admin/staff"
  element={
    <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
      <StaffListPage />
    </ProtectedRoute>
  }
/>
          <Route element={<VetDashboardLayout />} path="/veterinarian">
            <Route element={<VetDashboardPage />} path="dashboard" />
            <Route element={<VetConsultationsPage />} path="consultations" />
            <Route element={<VetConsultationFormPage />} path="consultations/:id" />
            <Route element={<VetPrescriptionPage />} path="consultations/:id/prescription" />
            <Route element={<VetSchedulePage />} path="schedule" />
            <Route element={<VetProfilePage />} path="profile" />
          </Route>
          <Route
            element={
              <ProtectedRoute allowedRoles={['RECEPTIONIST']}>
                <ReceptionistLayout />
              </ProtectedRoute>
            }
            path="/receptionist"
          >
            <Route index element={<ReceptionistDashboardPage />} />
            <Route element={<ReceptionistDashboardPage />} path="dashboard" />
            <Route element={<ReceptionistAppointmentsPage />} path="appointments" />
            <Route element={<ReceptionistCreateAppointmentPage />} path="appointments/new" />
            <Route element={<ReceptionistAppointmentDetailPage />} path="appointments/:id" />
            <Route element={<ReceptionistOwnersPage />} path="owners" />
            <Route element={<ReceptionistOwnerDetailPage />} path="owners/:id" />
            <Route element={<ReceptionistPetsPage />} path="pets" />
            <Route element={<ReceptionistPetDetailPage />} path="pets/:id" />
            <Route element={<ReceptionistVetScheduleListPage />} path="schedule" />
            <Route element={<ReceptionistSchedulePage />} path="schedule/:vetId" />
            <Route element={<ReceptionistProfilePage />} path="profile" />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}

export default App
