import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { dashboardService } from '../services/dashboard.service'
import type { VetAppointmentSummary } from '../types/dashboard.types'
import { useVetAppointments } from './useVetAppointments'

vi.mock('../services/dashboard.service', () => ({
  dashboardService: {
    listAppointments: vi.fn(),
  },
}))

function appointment(
  overrides: Partial<VetAppointmentSummary> &
    Pick<VetAppointmentSummary, 'apt_id' | 'pet_name'>,
): VetAppointmentSummary {
  return {
    pet_id: 'pet-1',
    pet_species: 'Pug',
    vet_name: 'Wolverine Rondina',
    owner_name: 'Aj Suico',
    apt_type: 'CONSULTATION',
    apt_status: 'CONFIRMED',
    apt_scheduled_at: '2026-11-18T09:30:00+08:00',
    apt_reason: null,
    screening: null,
    ...overrides,
  }
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe('useVetAppointments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hides pending appointments from the vet appointments list', async () => {
    vi.mocked(dashboardService.listAppointments).mockResolvedValue([
      appointment({ apt_id: 'apt-pending', pet_name: 'Thor', apt_status: 'PENDING' }),
      appointment({ apt_id: 'apt-confirmed', pet_name: 'Luna', apt_status: 'CONFIRMED' }),
    ])

    const { result } = renderHook(() => useVetAppointments(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.map((item) => item.apt_id)).toEqual(['apt-confirmed'])
  })
})
