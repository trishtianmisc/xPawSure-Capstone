import { Text, View } from 'react-native'

import { useTheme } from '../../../src/context/ThemeContext'

export default function ScheduleScreen() {
  const { colors } = useTheme()
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>My Schedule</Text>
      <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Today's appointments</Text>
    </View>
  )
}
