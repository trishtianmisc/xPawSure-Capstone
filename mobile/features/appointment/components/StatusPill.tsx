import { StyleSheet, Text, View } from 'react-native'

import type { AppointmentStatus } from '../types'

const STATUS_STYLES: Record<AppointmentStatus, { label: string; bg: string; text: string }> = {
  PENDING: { label: 'Awaiting confirmation', bg: '#FDEBD0', text: '#E67E22' },
  CONFIRMED: { label: 'Confirmed', bg: '#D6EAF8', text: '#2471A3' },
  CHECKED_IN: { label: 'Checked in', bg: '#FCF3CF', text: '#B7950B' },
  IN_PROGRESS: { label: 'In progress', bg: '#E8DAEF', text: '#6C3483' },
  COMPLETED: { label: 'Completed', bg: '#D5F5E3', text: '#1E8449' },
  CANCELLED: { label: 'Cancelled', bg: '#FADBD8', text: '#C0392B' },
  NO_SHOW: { label: 'No show', bg: '#E5E7E9', text: '#566573' },
}

export function StatusPill({ status }: { status: AppointmentStatus }) {
  const config = STATUS_STYLES[status] ?? STATUS_STYLES.PENDING

  return (
    <View style={[styles.pill, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontSize: 11, fontWeight: '700' },
})
