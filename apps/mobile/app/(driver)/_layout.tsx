import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../../lib/auth";

export default function DriverLayout() {
  const { me, ready } = useAuth();
  if (!ready) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }
  if (!me) return <Redirect href="/sign-in" />;
  if (me.role !== "driver") return <Redirect href="/(owner)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
