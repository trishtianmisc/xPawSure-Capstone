import { Text, View } from 'react-native'

export default function VetAppointmentListScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Appointments</Text>
      <Text style={{ color: '#666', marginTop: 8 }}>All assigned appointments</Text>
    </View>
  )
}
