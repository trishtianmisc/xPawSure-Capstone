import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { StaffMember } from '../types/staff.types'
import { useStaffAction } from '../hooks/useStaffAction'
import { useStaffActivity } from '../hooks/useStaffActivity'
import { useStaffDetail } from '../hooks/useStaffDetail'
import { StaffDetailPage } from './StaffDetailPage'

vi.mock('../hooks/useStaffDetail', () => ({ useStaffDetail: vi.fn() }))
vi.mock('../hooks/useStaffActivity', () => ({ useStaffActivity: vi.fn() }))
vi.mock('../hooks/useStaffAction', () => ({
  useStaffAction: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}))
vi.mock('../../../components/ui/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/clinic/staff/staff-1']}>
      <Routes>
        <Route path="/clinic/staff/:id" element={<StaffDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const baseStaff: StaffMember = {
  id: 'staff-1',
  user_id: 'user-1',
  email: 'someone@clinic.test',
  first_name: 'Sam',
  last_name: 'Staff',
  phone: '+639171234567',
  role: 'RECEPTIONIST',
  position: 'RECEPTIONIST',
  is_active: true,
  must_change_password: false,
  created_at: '2026-01-01T00:00:00Z',
  clinic_name: 'Test Clinic',
  license_number: null,
  license_expiration_date: null,
}

function mockStaff(staff: Partial<StaffMember>) {
  vi.mocked(useStaffDetail).mockReturnValue({
    data: { ...baseStaff, ...staff },
    isLoading: false,
    error: null,
  } as unknown as ReturnType<typeof useStaffDetail>)
}

function mockActivity(data: { appointments_this_month: number; patients_seen_this_month: number; screenings_reviewed_this_month: number } | undefined) {
  vi.mocked(useStaffActivity).mockReturnValue({
    data,
    isLoading: false,
    error: null,
  } as unknown as ReturnType<typeof useStaffActivity>)
}

describe('StaffDetailPage activity summary visibility', () => {
  beforeEach(() => {
    vi.mocked(useStaffAction).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useStaffAction>)
    mockActivity(undefined)
    mockStaff({})
  })

  it('hides the activity summary for receptionists', () => {
    mockStaff({ role: 'RECEPTIONIST', position: 'RECEPTIONIST' })
    renderPage()

    expect(screen.queryByText('Activity Summary')).not.toBeInTheDocument()
    expect(screen.queryByText('Appointments This Month')).not.toBeInTheDocument()
    expect(screen.queryByText('Patients Seen This Month')).not.toBeInTheDocument()
    expect(screen.queryByText('Screenings Reviewed This Month')).not.toBeInTheDocument()
    expect(vi.mocked(useStaffActivity)).toHaveBeenCalledWith('staff-1', false)
  })

  it('hides the activity summary for clinic admins', () => {
    mockStaff({ role: 'CLINIC_ADMIN', position: 'CLINIC_ADMIN' } as unknown as Partial<StaffMember>)
    renderPage()

    expect(screen.queryByText('Activity Summary')).not.toBeInTheDocument()
    expect(vi.mocked(useStaffActivity)).toHaveBeenCalledWith('staff-1', false)
  })

  it('shows the activity summary with its three metrics for veterinarians', () => {
    mockStaff({
      role: 'VETERINARIAN',
      position: 'VETERINARIAN',
      license_number: '1234567',
      license_expiration_date: '2030-12-31',
    })
    mockActivity({
      appointments_this_month: 12,
      patients_seen_this_month: 8,
      screenings_reviewed_this_month: 5,
    })
    renderPage()

    expect(screen.getByText('Activity Summary')).toBeInTheDocument()
    expect(screen.getByText('Appointments This Month')).toBeInTheDocument()
    expect(screen.getByText('Patients Seen This Month')).toBeInTheDocument()
    expect(screen.getByText('Screenings Reviewed This Month')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(vi.mocked(useStaffActivity)).toHaveBeenCalledWith('staff-1', true)
  })

  it('shows em-dashes until the activity query resolves', () => {
    mockStaff({
      role: 'VETERINARIAN',
      position: 'VETERINARIAN',
      license_number: '1234567',
      license_expiration_date: '2030-12-31',
    })
    mockActivity(undefined)
    renderPage()

    expect(screen.getAllByText('—')).toHaveLength(3)
  })
})
