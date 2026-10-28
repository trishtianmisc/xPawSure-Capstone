import { StyleSheet, Text, View } from 'react-native'

import { font } from '../../../src/theme/typography'
import { STATUS_PRESENTATION } from '../lib/statusPresentation'
import type { AppointmentStatus } from '../types'

export function StatusPill({ status }: { status: AppointmentStatus }) {
  const config = STATUS_PRESENTATION[status] ?? STATUS_PRESENTATION.PENDING

  return (
    <View style={[styles.pill, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  text: { ...font.bold, fontSize: 11 },
})
