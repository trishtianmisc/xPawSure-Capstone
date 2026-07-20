import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function VaccinationDetailScreen() {
  const { id } = useLocalSearchParams();
  return (
    <View>
      <Text>Vaccination Detail - {id}</Text>
    </View>
  );
}
