import { Text, View } from 'react-native'

export default function VetProfileScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Profile</Text>
      <Text style={{ color: '#666', marginTop: 8 }}>Veterinarian profile</Text>
    </View>
  )
}
