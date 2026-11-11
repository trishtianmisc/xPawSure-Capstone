import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useOwners } from '../hooks/useOwners'
import { useCreatePet } from '../hooks/usePets'
import { PetRegisterModal } from './PetRegisterModal'

vi.mock('../hooks/useOwners', () => ({ useOwners: vi.fn() }))
vi.mock('../hooks/usePets', () => ({ useCreatePet: vi.fn() }))
vi.mock('../../../components/ui/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

const ownerRow = {
  own_id: '123e4567-e89b-42d3-a456-426614174000',
  full_name: 'Olivia Owner',
  email: 'olivia@example.com',
  phone: '09171234567',
  pet_count: 1,
  own_created_at: '2026-01-01T00:00:00+08:00',
}

const mutate = vi.fn()

function renderModal(props: Partial<Parameters<typeof PetRegisterModal>[0]> = {}) {
  return render(<PetRegisterModal open onClose={vi.fn()} {...props} />)
}

async function fillValidForm() {
  fireEvent.change(await screen.findByLabelText('Pet name'), {
    target: { value: 'Rex' },
  })
  fireEvent.change(screen.getByLabelText('Sex'), {
    target: { value: 'MALE' },
  })
}

describe('PetRegisterModal', () => {
  beforeEach(() => {
    mutate.mockReset()
    vi.mocked(useOwners).mockReturnValue({
      data: {
        total: 1,
        page: 1,
        page_size: 20,
        total_pages: 1,
        results: [ownerRow],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof useOwners>)
    vi.mocked(useCreatePet).mockReturnValue({
      mutate,
      isPending: false,
      error: null,
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useCreatePet>)
  })

  it('shows validation errors when submitted empty', async () => {
    renderModal()

    fireEvent.click(screen.getByRole('button', { name: 'Register patient' }))

    expect(await screen.findByText('Select an owner')).toBeInTheDocument()
    expect(screen.getByText('Pet name is required')).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('submits the chosen owner, name, and sex', async () => {
    renderModal()

    fireEvent.change(screen.getByRole('combobox', { name: 'Select owner' }), {
      target: { value: ownerRow.own_id },
    })
    await fillValidForm()

    fireEvent.click(screen.getByRole('button', { name: 'Register patient' }))

    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          owner_id: ownerRow.own_id,
          pet_name: 'Rex',
          pet_sex: 'MALE',
        }),
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      ),
    )
  })

  it('locks the owner to the prop instead of showing a picker', async () => {
    renderModal({
      ownerId: ownerRow.own_id,
      ownerLabel: 'Olivia Owner',
    })

    expect(screen.getByText('Olivia Owner')).toBeInTheDocument()
    expect(
      screen.queryByRole('combobox', { name: 'Select owner' }),
    ).toBeNull()

    await fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: 'Register patient' }))

    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ owner_id: ownerRow.own_id }),
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      ),
    )
  })

  it('surfaces a server error without closing', () => {
    vi.mocked(useCreatePet).mockReturnValue({
      mutate,
      isPending: false,
      error: new Error('Request failed'),
      reset: vi.fn(),
    } as unknown as ReturnType<typeof useCreatePet>)

    renderModal()

    expect(screen.getByRole('alert')).toHaveTextContent('Request failed')
  })
})
