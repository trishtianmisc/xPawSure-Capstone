import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthUser } from '../../../auth/login/types/auth.types'
import { ProfilePage } from './ProfilePage'

const authMocks = vi.hoisted(() => ({
  user: null as AuthUser | null,
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
}))

vi.mock('../../../auth/context/AuthContext', () => ({
  useAuth: () => authMocks,
}))

const veterinarian: AuthUser = {
  id: 'vet-1',
  email: 'vet@example.com',
  role: 'VETERINARIAN',
  first_name: 'Vera',
  last_name: 'Vet',
  phone: '09171234567',
  must_change_password: false,
  clinic_name: 'Happy Paws Clinic',
  position: 'VETERINARIAN',
  license_number: 'VET-12345',
  license_expiration_date: '2030-12-31',
  profile_picture: 'https://cdn.example.com/avatar.png',
}

const createObjectURL = vi.fn(() => 'blob:profile-preview')
const revokeObjectURL = vi.fn()

function renderPage() {
  return render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>,
  )
}

describe('veterinarian ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.user = veterinarian
    authMocks.getProfile.mockResolvedValue(veterinarian)
    authMocks.updateProfile.mockResolvedValue(veterinarian)
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    })
  })

  it('shows the saved profile picture and read-only fields until editing starts', () => {
    renderPage()

    expect(screen.getByRole('img', { name: 'Profile picture' })).toHaveAttribute(
      'src',
      'https://cdn.example.com/avatar.png',
    )
    expect(screen.getByDisplayValue('Vera')).toHaveAttribute('readonly')
    expect(screen.getByDisplayValue('Vet')).toHaveAttribute('readonly')
    expect(screen.getByDisplayValue('09171234567')).toHaveAttribute('readonly')
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Update profile picture' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit profile' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Change password' })).toBeInTheDocument()
  })

  it('enables only editable fields and actions while editing', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }))

    const firstName = screen.getByDisplayValue('Vera')
    expect(firstName).not.toHaveAttribute('readonly')
    expect(screen.getByRole('button', { name: 'Update profile picture' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit profile' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()

    fireEvent.change(firstName, { target: { value: 'Veronica' } })
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByDisplayValue('Vera')).toHaveAttribute('readonly')
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
  })

  it('asks for confirmation before saving and keeps edits when dismissed', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }))
    fireEvent.change(screen.getByDisplayValue('Vera'), { target: { value: 'Veronica' } })

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    const dialog = await screen.findByRole('dialog', { name: 'Save profile changes?' })
    expect(
      within(dialog).getByText('Are you sure you want to save these changes to your profile?'),
    ).toBeInTheDocument()
    expect(authMocks.updateProfile).not.toHaveBeenCalled()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep editing' }))

    expect(screen.queryByRole('dialog', { name: 'Save profile changes?' })).not.toBeInTheDocument()
    expect(authMocks.updateProfile).not.toHaveBeenCalled()
    expect(screen.getByDisplayValue('Veronica')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled()
  })

  it('previews and saves a new profile picture', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }))

    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Profile picture file'), {
      target: { files: [file] },
    })

    expect(createObjectURL).toHaveBeenCalledWith(file)
    expect(screen.getByRole('img', { name: 'Profile picture' })).toHaveAttribute(
      'src',
      'blob:profile-preview',
    )
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    const dialog = await screen.findByRole('dialog', { name: 'Save profile changes?' })
    expect(
      within(dialog).getByText('Your new profile picture will also be saved.'),
    ).toBeInTheDocument()
    expect(authMocks.updateProfile).not.toHaveBeenCalled()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(authMocks.updateProfile).toHaveBeenCalledWith({
        first_name: 'Vera',
        last_name: 'Vet',
        phone: '09171234567',
        profile_picture: file,
      }),
    )
    await waitFor(() =>
      expect(screen.getByText('Profile updated successfully.')).toBeInTheDocument(),
    )

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:profile-preview')
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Profile picture' })).toHaveAttribute(
      'src',
      'https://cdn.example.com/avatar.png',
    )
  })

  it('rejects unsupported profile picture formats', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }))

    const file = new File(['avatar'], 'avatar.gif', { type: 'image/gif' })
    fireEvent.change(screen.getByLabelText('Profile picture file'), {
      target: { files: [file] },
    })

    expect(
      screen.getByText('Profile picture must be a JPEG, PNG, or WebP image.'),
    ).toBeInTheDocument()
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    expect(screen.getByRole('img', { name: 'Profile picture' })).toHaveAttribute(
      'src',
      'https://cdn.example.com/avatar.png',
    )
  })
})
