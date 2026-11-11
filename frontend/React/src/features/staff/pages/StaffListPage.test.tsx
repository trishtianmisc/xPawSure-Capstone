import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useStaff } from '../hooks/useStaff'
import { useStaffStats } from '../hooks/useStaffStats'
import { StaffListPage } from './StaffListPage'

vi.mock('../hooks/useStaff', () => ({ useStaff: vi.fn() }))
vi.mock('../hooks/useStaffStats', () => ({ useStaffStats: vi.fn() }))
vi.mock('../hooks/useStaffAction', () => ({
  useStaffAction: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}))
vi.mock('../../../components/ui/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StaffListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const staffRow = {
  id: 'staff-1',
  user_id: 'user-1',
  email: 'alice@test.com',
  first_name: 'Alice',
  last_name: 'Anderson',
  phone: '+639171234567',
  role: 'RECEPTIONIST',
  position: 'RECEPTIONIST',
  is_active: true,
  must_change_password: false,
  created_at: '2026-01-01T00:00:00Z',
  license_number: null,
  license_expiration_date: null,
}

describe('StaffListPage name sorting', () => {
  beforeEach(() => {
    vi.mocked(useStaffStats).mockReturnValue({
      data: {
        total: 12,
        veterinarians: 1,
        receptionists: 11,
        active: 12,
        pending_setup: 0,
        deactivated: 0,
        licenses_expiring_soon: 0,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useStaffStats>)
    vi.mocked(useStaff).mockReturnValue({
      data: {
        total: 12,
        page: 1,
        page_size: 10,
        total_pages: 2,
        results: [staffRow],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof useStaff>)
  })

  it('marks the Name column as ascending by default and sends sort on click', async () => {
    renderPage()

    const nameHeader = screen.getByRole('columnheader', { name: /Name/ })
    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending')
    expect(vi.mocked(useStaff).mock.lastCall?.[0]?.sort).toBe('first_name')

    fireEvent.click(nameHeader)
    await waitFor(() => {
      expect(vi.mocked(useStaff).mock.lastCall?.[0]?.sort).toBe('-first_name')
    })
    expect(nameHeader).toHaveAttribute('aria-sort', 'descending')
  })

  it('resets to page 1 when the sort is toggled', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => {
      expect(vi.mocked(useStaff).mock.lastCall?.[0]?.page).toBe(2)
    })

    fireEvent.click(screen.getByRole('columnheader', { name: /Name/ }))
    await waitFor(() => {
      const params = vi.mocked(useStaff).mock.lastCall?.[0]
      expect(params?.sort).toBe('-first_name')
      expect(params?.page).toBe(1)
    })
  })

  it('toggles back to ascending on a second click', async () => {
    renderPage()

    const nameHeader = screen.getByRole('columnheader', { name: /Name/ })
    fireEvent.click(nameHeader)
    fireEvent.click(nameHeader)
    await waitFor(() => {
      expect(vi.mocked(useStaff).mock.lastCall?.[0]?.sort).toBe('first_name')
    })
  })
})
