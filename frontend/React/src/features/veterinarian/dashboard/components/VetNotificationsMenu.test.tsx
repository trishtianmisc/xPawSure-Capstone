import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Notification } from '../../../notifications/types/notification.types'
import {
  useMarkAllVetNotificationsRead,
  useMarkVetNotificationRead,
  useVetNotifications,
  useVetUnreadCount,
} from '../hooks/useVetNotifications'
import { VetNotificationsMenu } from './VetNotificationsMenu'

vi.mock('../hooks/useVetNotifications', () => ({
  useVetNotifications: vi.fn(),
  useVetUnreadCount: vi.fn(),
  useMarkVetNotificationRead: vi.fn(),
  useMarkAllVetNotificationsRead: vi.fn(),
}))

const notification: Notification = {
  ntf_id: 'ntf-1',
  ntf_title: 'New Appointment Confirmed',
  ntf_message: 'Max has a confirmed appointment.',
  ntf_type: 'APPOINTMENT_CONFIRMED',
  ntf_is_read: false,
  ntf_reference_table: 'APPOINTMENT',
  ntf_reference_id: 'apt-1',
  ntf_created_at: '2026-11-13T09:00:00+08:00',
  ntf_read_at: null,
}

function AppointmentDetailStub() {
  const { id } = useParams()
  return <p>Appointment {id}</p>
}

function renderMenu() {
  return render(
    <MemoryRouter initialEntries={['/veterinarian/dashboard']}>
      <Routes>
        <Route element={<VetNotificationsMenu />} path="/veterinarian/dashboard" />
        <Route element={<AppointmentDetailStub />} path="/veterinarian/appointments/:id" />
      </Routes>
    </MemoryRouter>,
  )
}

describe('VetNotificationsMenu', () => {
  const markRead = vi.fn()

  beforeEach(() => {
    vi.mocked(useVetUnreadCount).mockReturnValue({
      data: { unread_count: 1 },
    } as unknown as ReturnType<typeof useVetUnreadCount>)
    vi.mocked(useVetNotifications).mockReturnValue({
      data: {
        total: 1,
        page: 1,
        page_size: 8,
        total_pages: 1,
        results: [notification],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useVetNotifications>)
    vi.mocked(useMarkVetNotificationRead).mockReturnValue({
      mutate: markRead,
      isPending: false,
    } as unknown as ReturnType<typeof useMarkVetNotificationRead>)
    vi.mocked(useMarkAllVetNotificationsRead).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useMarkAllVetNotificationsRead>)
    markRead.mockReset()
  })

  it('opens the list and navigates appointment notifications to the detail page', () => {
    renderMenu()

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }))
    expect(screen.getByText('New Appointment Confirmed')).toBeInTheDocument()

    fireEvent.click(screen.getByText('New Appointment Confirmed'))

    expect(markRead).toHaveBeenCalledWith('ntf-1')
    expect(screen.getByText('Appointment apt-1')).toBeInTheDocument()
  })

  it('shows the unread badge on the bell', () => {
    renderMenu()

    expect(screen.getByText('1')).toBeInTheDocument()
  })
})
