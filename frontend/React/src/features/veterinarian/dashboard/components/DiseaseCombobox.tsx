import { useEffect, useRef, useState } from 'react'

import { DISEASE_OPTIONS, OTHER_DISEASE } from '../constants/diseases'

interface DiseaseComboboxProps {
  value: string
  customValue: string
  onSelect: (selection: string) => void
  onCustomChange: (text: string) => void
  id?: string
  className?: string
}

export function DiseaseCombobox({
  value,
  customValue,
  onSelect,
  onCustomChange,
  id,
  className = '',
}: DiseaseComboboxProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const isOther = value === OTHER_DISEASE

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  function handleSelect(option: string) {
    onSelect(option)
    setOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <input
          id={id}
          className={`w-full rounded-md border border-stone-300 bg-white px-3 py-2 pr-9 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 ${className}`}
          placeholder={isOther ? 'Type disease name' : 'Select disease'}
          readOnly={!isOther}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={id ? `${id}-listbox` : undefined}
          aria-autocomplete="none"
          value={isOther ? customValue : value}
          onChange={(event) => {
            if (isOther) onCustomChange(event.target.value)
          }}
          onClick={() => {
            if (!isOther) setOpen((prev) => !prev)
          }}
        />
        <button
          type="button"
          aria-label={open ? 'Close disease list' : 'Open disease list'}
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-stone-500 transition hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
          onClick={() => setOpen((prev) => !prev)}
        >
          <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {open && (
        <ul
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-600 dark:bg-stone-800"
        >
          {DISEASE_OPTIONS.map((option) => (
            <li key={option}>
              <button
                type="button"
                role="option"
                aria-selected={option === value}
                className={`block w-full px-3 py-2 text-left text-sm transition hover:bg-amber-50 dark:hover:bg-stone-700 ${
                  option === value
                    ? 'font-semibold text-amber-900 dark:text-amber-300'
                    : 'text-stone-700 dark:text-stone-200'
                }`}
                onClick={() => handleSelect(option)}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
