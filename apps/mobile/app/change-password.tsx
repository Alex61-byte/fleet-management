import { Link, Redirect } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../lib/auth";

/** Retired temp-password gate — drivers use /invite?token=… */
export default function ChangePasswordScreen() {
  const { me, ready } = useAuth();
  if (ready && me) {
    return <Redirect href={me.role === "driver" ? "/(driver)" : "/(owner)"} />;
  }
  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="p-2 gap-2">
        <Text className="font-semibold text-title text-text-primary">Invitation required</Text>
        <Text className="text-body text-text-secondary">
          Use the link from your invitation email to set a password. Temporary passwords are no longer used.
        </Text>
        <Link href="/sign-in" className="text-brand text-label font-medium min-h-hit">
          Back to sign in
        </Link>
      </View>
    </SafeAreaView>
  );
}
