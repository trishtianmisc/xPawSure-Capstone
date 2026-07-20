import { Text, View } from 'react-native'

export default function ScheduleScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>My Schedule</Text>
      <Text style={{ color: '#666', marginTop: 8 }}>Today's appointments</Text>
    </View>
  )
}
