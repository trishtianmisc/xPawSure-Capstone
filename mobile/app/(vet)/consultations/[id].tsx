import { useLocalSearchParams } from 'expo-router'
import { Text, View } from 'react-native'

export default function VetConsultationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Consultation</Text>
      <Text style={{ color: '#666', marginTop: 8 }}>ID: {id}</Text>
    </View>
  )
}
