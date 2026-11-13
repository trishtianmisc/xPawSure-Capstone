import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker'
import { useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'

import { useTheme } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'
import { formatBirthDateDisplay, isFutureIsoDate, isoToDate, toIsoDate } from '../lib/date'

interface BirthDateFieldProps {
  value: string
  onChange: (iso: string) => void
}

/**
 * Tappable birth-date field backed by the native date picker.
 * Emits YYYY-MM-DD strings only (empty string clears the date).
 * Selection is capped at today; Android uses the native dialog,
 * iOS shows an inline spinner with Cancel/Done.
 */
export function BirthDateField({ value, onChange }: BirthDateFieldProps) {
  const { colors, isDark } = useTheme()
  const [iosVisible, setIosVisible] = useState(false)
  const [draft, setDraft] = useState<Date>(new Date())

  const maximumDate = (() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  })()

  const openPicker = () => {
    const initial = isoToDate(value)
    setDraft(initial)
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initial,
        mode: 'date',
        display: 'default',
        maximumDate,
        onChange: (event: DateTimePickerEvent, selected?: Date) => {
          if (event.type === 'set' && selected && !isFutureIsoDate(toIsoDate(selected))) {
            onChange(toIsoDate(selected))
          }
        },
      })
      return
    }
    setIosVisible(true)
  }

  const displayValue = formatBirthDateDisplay(value)

  return (
    <View>
      <Pressable
        accessibilityLabel="Birth date"
        accessibilityRole="button"
        onPress={openPicker}
        style={[styles.trigger, { backgroundColor: colors.bg, borderColor: colors.border }]}
      >
        <Text
          numberOfLines={1}
          style={[styles.triggerText, { color: value ? colors.text : colors.textMuted }]}
        >
          {value ? displayValue || value : 'Select date…'}
        </Text>
        {value !== '' && (
          <Pressable
            accessibilityLabel="Clear birth date"
            hitSlop={8}
            onPress={() => onChange('')}
            style={styles.clearWrap}
          >
            <MaterialCommunityIcons color={colors.textMuted} name="close-circle" size={18} />
          </Pressable>
        )}
        <MaterialCommunityIcons color={colors.textMuted} name="calendar-month-outline" size={20} />
      </Pressable>

      {iosVisible && Platform.OS === 'ios' && (
        <View style={[styles.iosPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <DateTimePicker
            display="spinner"
            maximumDate={maximumDate}
            mode="date"
            onChange={(_, selected) => {
              if (selected) setDraft(selected)
            }}
            value={draft}
            themeVariant={isDark ? 'dark' : 'light'}
          />
          <View style={styles.iosActions}>
            <Pressable
              accessibilityLabel="Cancel date selection"
              hitSlop={8}
              onPress={() => setIosVisible(false)}
              style={styles.iosBtn}
            >
              <Text style={[styles.iosBtnText, { color: colors.textMuted }]}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Confirm date selection"
              hitSlop={8}
              onPress={() => {
                if (!isFutureIsoDate(toIsoDate(draft))) {
                  onChange(toIsoDate(draft))
                }
                setIosVisible(false)
              }}
              style={styles.iosBtn}
            >
              <Text style={[styles.iosBtnText, { color: colors.primary }]}>Done</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  )
}

function isValidDisplay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

const styles = StyleSheet.create({
  trigger: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    height: 50,
    paddingHorizontal: 16,
    gap: 10,
  },
  triggerText: { ...font.regular, flex: 1, fontSize: 15 },
  clearWrap: { alignItems: 'center', justifyContent: 'center' },
  iosPanel: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  iosActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 20,
  },
  iosBtn: { paddingVertical: 4 },
  iosBtnText: { ...font.semibold, fontSize: 15 },
})
