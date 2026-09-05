import { useRouter } from "expo-router";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../../components/ui";

export default function DriverDenied() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-surface p-2 gap-2">
      <Text className="font-semibold text-title text-text-primary">This area is for Owners and Admins.</Text>
      <PrimaryButton title="Back to home" onPress={() => router.replace("/(driver)")} />
    </SafeAreaView>
  );
}
