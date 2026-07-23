import { Modal } from '../../../components/ui'
import { VeterinarianForm } from './VeterinarianForm'

interface AddVeterinarianModalProps {
  open: boolean
  onClose: () => void
}

export function AddVeterinarianModal({ open, onClose }: AddVeterinarianModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Add Veterinarian">
      <VeterinarianForm onClose={onClose} />
    </Modal>
  )
}
