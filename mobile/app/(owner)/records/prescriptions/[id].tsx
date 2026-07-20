import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function PrescriptionDetailScreen() {
  const { id } = useLocalSearchParams();
  return (
    <View>
      <Text>Prescription Detail - {id}</Text>
    </View>
  );
}
