import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function PetDetailScreen() {
  const { id } = useLocalSearchParams();
  return (
    <View>
      <Text>Pet Detail - {id}</Text>
    </View>
  );
}
