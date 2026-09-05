import { Link, Stack } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SecondaryButton } from "../../../components/ui";
import { useAuth } from "../../../lib/auth";

export default function MoreHome() {
  const { me, signOut } = useAuth();
  return (
    <View className="flex-1 bg-surface p-2 gap-2">
      <Stack.Screen options={{ title: "More" }} />
      <Link href="/(owner)/more/security" asChild>
        <Pressable className="bg-surface-raised border border-border rounded-md p-2 min-h-hit">
          <Text className="font-medium text-label text-text-primary">Security</Text>
        </Pressable>
      </Link>
      {me?.role === "owner" ? (
        <Link href="/(owner)/more/admins" asChild>
          <Pressable className="bg-surface-raised border border-border rounded-md p-2 min-h-hit">
            <Text className="font-medium text-label text-text-primary">Admins</Text>
          </Pressable>
        </Link>
      ) : null}
      <SecondaryButton title="Sign out" onPress={() => void signOut()} />
    </View>
  );
}
