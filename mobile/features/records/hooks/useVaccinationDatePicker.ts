import { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import { useState } from 'react'
import { Keyboard, Platform } from 'react-native'

import { isoToDate, toIsoDate } from '../../pet/lib/date'
import { isWithinDateBounds, vaccinationPickerDate } from '../lib/vaccinationDate'

interface DatePickerOptions {
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  minimum?: string
  maximum?: string
}

export function useVaccinationDatePicker({ value, onChange, onBlur, minimum, maximum }: DatePickerOptions) {
  const [visible, setVisible] = useState(false)
  const [draft, setDraft] = useState(new Date())
  const minimumDate = minimum ? isoToDate(minimum) : undefined
  const maximumDate = maximum ? isoToDate(maximum) : undefined

  const select = (selected: Date) => {
    const iso = toIsoDate(selected)
    if (isWithinDateBounds(iso, minimum, maximum)) onChange(iso)
  }

  const open = () => {
    Keyboard.dismiss()
    const initial = vaccinationPickerDate(value, minimum, maximum)
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initial,
        mode: 'date',
        display: 'calendar',
        minimumDate,
        maximumDate,
        onChange: (event, selected) => {
          if (event.type === 'set' && selected) select(selected)
          onBlur()
        },
      })
      return
    }
    setDraft(initial)
    setVisible(true)
  }

  const close = () => {
    setVisible(false)
    onBlur()
  }

  const confirm = () => {
    select(draft)
    close()
  }

  const clear = () => {
    onChange('')
    close()
  }

  return { open, close, confirm, clear, visible, draft, setDraft, minimumDate, maximumDate }
}
