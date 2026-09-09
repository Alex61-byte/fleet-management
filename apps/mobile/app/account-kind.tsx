import { Link, Redirect, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../lib/auth";

function KindOption({
  href,
  title,
  supporting,
  a11y,
}: {
  href: "/sign-up" | "/individual-sign-up";
  title: string;
  supporting: string;
  a11y: string;
}) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      className="min-h-hit rounded-md border border-border bg-surface-raised px-3 py-2 gap-0.5"
      onPress={() => router.push(href)}
    >
      <Text className="font-semibold text-label text-text-primary">{title}</Text>
      <Text className="text-caption text-text-secondary">{supporting}</Text>
    </Pressable>
  );
}

export default function AccountKindScreen() {
  const { me, ready } = useAuth();

  if (ready && me) {
    if (me.role === "driver") return <Redirect href="/(driver)" />;
    return <Redirect href="/(owner)" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView contentContainerClassName="p-2 gap-2">
        <Text className="font-semibold text-title text-text-primary">Create account</Text>
        <Text className="text-body text-text-secondary">Choose how you will use Fleet.</Text>
        <View className="gap-2" accessibilityRole="summary">
          <KindOption
            href="/sign-up"
            title="Company"
            supporting="Register an organization. Manage drivers and vehicles."
            a11y="Company. Register an organization. Manage drivers and vehicles."
          />
          <KindOption
            href="/individual-sign-up"
            title="Individual"
            supporting="Personal account. Manage your own vehicles only."
            a11y="Individual. Personal account. Manage your own vehicles only."
          />
        </View>
        <Link href="/sign-in" className="text-brand text-label font-medium min-h-hit">
          Already have an account? Sign in
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}
