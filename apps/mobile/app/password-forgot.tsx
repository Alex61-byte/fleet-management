import { Link } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Banner, Field, PrimaryButton, TextInput } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function ForgotScreen() {
  const { offline } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await api.forgotPassword(email);
    } finally {
      setDone(true);
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface p-2 gap-2">
      <Text className="font-semibold text-title text-text-primary">Reset password</Text>
      {offline ? <Banner tone="warning">You are offline.</Banner> : null}
      {done ? (
        <Text className="text-body text-text-primary">
          If this email is an Owner or Admin, you can continue with the reset.
        </Text>
      ) : (
        <>
          <Field label="Email">
            <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          </Field>
          <PrimaryButton title="Send reset" onPress={() => void submit()} busy={busy} disabled={offline} />
        </>
      )}
      <Link href="/sign-in" className="text-brand text-label font-medium min-h-hit">
        Back to sign in
      </Link>
    </SafeAreaView>
  );
}
