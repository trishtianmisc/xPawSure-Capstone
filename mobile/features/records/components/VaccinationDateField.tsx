import { MaterialCommunityIcons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'

import { useTheme } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'
import { formatBirthDateDisplay } from '../../pet/lib/date'
import { useVaccinationDatePicker } from '../hooks/useVaccinationDatePicker'

interface VaccinationDateFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  minimum?: string
  maximum?: string
  optional?: boolean
  invalid?: boolean
}

export function VaccinationDateField({
  label, value, onChange, onBlur, minimum, maximum, optional = false, invalid = false,
}: VaccinationDateFieldProps) {
  const { colors, isDark } = useTheme()
  const picker = useVaccinationDatePicker({ value, onChange, onBlur, minimum, maximum })
  const displayValue = formatBirthDateDisplay(value)

  return (
    <View>
      <View style={[
        styles.field,
        { backgroundColor: colors.bg, borderColor: invalid ? colors.error : colors.border },
      ]}>
        <Pressable
          accessibilityLabel={label}
          accessibilityRole="button"
          accessibilityValue={{ text: displayValue || 'No date selected' }}
          onPress={picker.open}
          style={styles.trigger}
        >
          <Text style={[styles.value, { color: value ? colors.text : colors.textMuted }]}>
            {displayValue || 'Select date'}
          </Text>
          <MaterialCommunityIcons color={colors.textMuted} name="calendar-month-outline" size={22} />
        </Pressable>
        {optional && value ? (
          <Pressable
            accessibilityLabel={`Clear ${label.toLowerCase()}`}
            accessibilityRole="button"
            onPress={picker.clear}
            style={styles.clear}
          >
            <MaterialCommunityIcons color={colors.textMuted} name="close-circle" size={20} />
          </Pressable>
        ) : null}
      </View>

      {picker.visible && Platform.OS === 'ios' ? (
        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <DateTimePicker
            display="inline"
            mode="date"
            value={picker.draft}
            minimumDate={picker.minimumDate}
            maximumDate={picker.maximumDate}
            themeVariant={isDark ? 'dark' : 'light'}
            onChange={(_, selected) => { if (selected) picker.setDraft(selected) }}
          />
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={picker.close} style={styles.action}>
              <Text style={[styles.actionText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={picker.confirm} style={styles.action}>
              <Text style={[styles.actionText, { color: colors.primary }]}>Done</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  field: { borderRadius: 12, borderWidth: 1, flexDirection: 'row', minHeight: 50 },
  trigger: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  value: { ...font.regular, flex: 1, fontSize: 15 },
  clear: { alignItems: 'center', justifyContent: 'center', minHeight: 48, width: 48 },
  panel: { borderRadius: 12, borderWidth: 1, marginTop: 8, padding: 4 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  action: { justifyContent: 'center', minHeight: 48, paddingHorizontal: 16 },
  actionText: { ...font.semibold, fontSize: 14 },
})
