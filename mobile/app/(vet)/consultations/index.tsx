import { Text, View } from 'react-native'

export default function VetConsultationListScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Consultations</Text>
      <Text style={{ color: '#666', marginTop: 8 }}>Patient consultations</Text>
    </View>
  )
}
