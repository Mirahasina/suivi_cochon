import { Link } from 'expo-router';
import { View, Text } from 'react-native';

export default function ModalScreen() {
  return (
    <View className="flex-1 items-center justify-center p-5 bg-background">
      <Text className="text-2xl font-bold text-primary">This is a modal</Text>
      <Link href="/" dismissTo className="mt-[15px] py-[15px]">
        <Text className="text-secondary font-bold">Go to home screen</Text>
      </Link>
    </View>
  );
}
