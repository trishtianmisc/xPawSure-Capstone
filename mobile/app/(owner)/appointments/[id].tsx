import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams();
  return (
    <View>
      <Text>Appointment Detail - {id}</Text>
    </View>
  );
}
