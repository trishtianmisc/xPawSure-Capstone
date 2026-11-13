import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Notification } from '../types/notification.types'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from '../hooks/useNotifications'
import { NotificationDropdown } from './NotificationDropdown'

vi.mock('../hooks/useNotifications', () => ({
  useUnreadCount: vi.fn(),
  useNotifications: vi.fn(),
  useMarkNotificationRead: vi.fn(),
  useMarkAllNotificationsRead: vi.fn(),
}))

function DetailProbe() {
  const { id } = useParams<{ id: string }>()
  return <div>detail:{id}</div>
}

function notification(
  overrides: Partial<Notification> = {},
): Notification {
  return {
    ntf_id: 'ntf-1',
    ntf_title: 'Appointment Rescheduled',
    ntf_message: 'Your appointment has been rescheduled.',
    ntf_type: 'SYSTEM',
    ntf_is_read: false,
    ntf_reference_table: 'APPOINTMENT',
    ntf_reference_id: 'apt-1',
    ntf_created_at: new Date().toISOString(),
    ntf_read_at: null,
    ...overrides,
  }
}

function renderDropdown(basePath = '/receptionist') {
  return render(
    <MemoryRouter initialEntries={[basePath]}>
      <NotificationDropdown basePath={basePath} />
      <Routes>
        <Route
          path={`${basePath}/appointments/:id`}
          element={<DetailProbe />}
        />
        <Route path={`${basePath}/staff/:id`} element={<DetailProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('NotificationDropdown', () => {
  const markRead = vi.fn()

  beforeEach(() => {
    markRead.mockReset()
    vi.mocked(useUnreadCount).mockReturnValue({
      data: { unread_count: 1 },
    } as unknown as ReturnType<typeof useUnreadCount>)
    vi.mocked(useMarkNotificationRead).mockReturnValue({
      mutate: markRead,
      isPending: false,
    } as unknown as ReturnType<typeof useMarkNotificationRead>)
    vi.mocked(useMarkAllNotificationsRead).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useMarkAllNotificationsRead>)
    vi.mocked(useNotifications).mockReturnValue({
      data: { results: [notification()] },
      isLoading: false,
    } as unknown as ReturnType<typeof useNotifications>)
  })

  it('deep-links an appointment notification to its detail page', () => {
    renderDropdown()

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }))
    fireEvent.click(
      screen.getByRole('button', { name: /Appointment Rescheduled/ }),
    )

    expect(screen.getByText('detail:apt-1')).toBeInTheDocument()
    expect(markRead).toHaveBeenCalledWith('ntf-1')
  })

  it('deep-links a staff notification under the given basePath', () => {
    vi.mocked(useNotifications).mockReturnValue({
      data: {
        results: [
          notification({
            ntf_id: 'ntf-staff',
            ntf_title: 'License Expiring Soon',
            ntf_message: 'The veterinary license for Vic Vet expires soon.',
            ntf_reference_table: 'STAFF',
            ntf_reference_id: 'staff-1',
          }),
        ],
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useNotifications>)

    renderDropdown('/clinic')

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }))
    fireEvent.click(
      screen.getByRole('button', { name: /License Expiring Soon/ }),
    )

    expect(screen.getByText('detail:staff-1')).toBeInTheDocument()
    expect(markRead).toHaveBeenCalledWith('ntf-staff')
  })

  it('navigates appointment references under the provided basePath', () => {
    renderDropdown('/clinic')

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }))
    fireEvent.click(
      screen.getByRole('button', { name: /Appointment Rescheduled/ }),
    )

    expect(screen.getByText('detail:apt-1')).toBeInTheDocument()
  })

  it('stays put for notifications without an appointment reference', () => {
    vi.mocked(useNotifications).mockReturnValue({
      data: {
        results: [
          notification({
            ntf_id: 'ntf-2',
            ntf_title: 'System notice',
            ntf_reference_table: null,
            ntf_reference_id: null,
          }),
        ],
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useNotifications>)

    renderDropdown()

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }))
    fireEvent.click(screen.getByRole('button', { name: /System notice/ }))

    expect(screen.queryByText(/detail:/)).toBeNull()
    expect(markRead).toHaveBeenCalledWith('ntf-2')
  })
})
