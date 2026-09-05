import { FleetApiError, mapAuthError } from "@fleet/sdk";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Banner, Field, PrimaryButton, TextInput } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function ResetScreen() {
  const { offline } = useAuth();
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState("");
  const [passwordError, setPasswordError] = useState("");

  async function submit() {
    setBanner("");
    setPasswordError("");
    if (password !== confirm) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await api.resetPassword(String(token ?? ""), password);
      router.replace("/sign-in");
    } catch (err) {
      if (err instanceof FleetApiError) {
        if (err.code === "password_too_short") setPasswordError(mapAuthError(err.code, err.message));
        else setBanner(mapAuthError(err.code, err.message));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface p-2 gap-2">
      <Text className="font-semibold text-title text-text-primary">Update password</Text>
      {offline ? <Banner tone="warning">You are offline.</Banner> : null}
      {banner ? <Banner>{banner}</Banner> : null}
      <Field label="New password" hint="At least 8 characters" error={passwordError}>
        <TextInput value={password} onChangeText={setPassword} secureTextEntry error={Boolean(passwordError)} />
      </Field>
      <Field label="Confirm password">
        <TextInput value={confirm} onChangeText={setConfirm} secureTextEntry />
      </Field>
      <PrimaryButton title="Update password" onPress={() => void submit()} busy={busy} disabled={offline} />
      <Link href="/password-forgot" className="text-brand text-label font-medium">
        Request a new reset
      </Link>
    </SafeAreaView>
  );
}
