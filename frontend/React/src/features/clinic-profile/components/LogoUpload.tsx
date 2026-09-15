import { useRef } from 'react'
import { Button } from '../../../components/ui'

interface LogoUploadProps {
  currentLogoUrl: string | null
  onUpload: (file: File) => void
  isUploading: boolean
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 2 * 1024 * 1024

export function LogoUpload({ currentLogoUrl, onUpload, isUploading }: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ACCEPTED_TYPES.includes(file.type)) {
      alert('Accepted formats: jpg, png, webp.')
      return
    }
    if (file.size > MAX_SIZE) {
      alert('File size must be 2 MB or less.')
      return
    }

    onUpload(file)
    e.target.value = ''
  }

  return (
    <div className="flex items-center gap-4">
      <div className="grid size-20 place-items-center rounded-full bg-stone-100 dark:bg-stone-700">
        {currentLogoUrl ? (
          <img
            src={currentLogoUrl}
            alt="Clinic logo"
            className="size-20 rounded-full object-cover"
          />
        ) : (
          <svg className="size-8 text-stone-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
          </svg>
        )}
      </div>
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleChange}
        />
        <Button
          variant="secondary"
          size="sm"
          loading={isUploading}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          {currentLogoUrl ? 'Replace Logo' : 'Upload Logo'}
        </Button>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          JPG, PNG, or WebP. Max 2 MB.
        </p>
      </div>
    </div>
  )
}
