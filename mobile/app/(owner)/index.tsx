import { Text, View } from 'react-native'

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Welcome to XPawSure</Text>
      <Text style={{ color: '#666', marginTop: 8 }}>Home screen</Text>
    </View>
  )
}
