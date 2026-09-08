import { FleetApiError, mapAuthError } from "@fleet/sdk";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Banner, Field, PrimaryButton, TextInput } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function IndividualSignUpScreen() {
  const { applySession, offline } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  const canSubmit =
    password.length >= 8 && confirm.length >= 8 && Boolean(email.trim()) && !offline && !busy;

  async function submit() {
    setBanner("");
    setEmailError("");
    setPasswordError("");
    setConfirmError("");
    if (!email.trim()) {
      setEmailError("Email is required.");
      return;
    }
    if (password !== confirm) {
      setConfirmError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.registerIndividual({
        email: email.trim(),
        password,
      });
      await applySession(res.access_token, res.refresh_token, res.principal, false);
      router.replace("/(owner)");
    } catch (err) {
      if (err instanceof FleetApiError) {
        if (err.code === "email_in_use") {
          setEmailError("This email cannot be used.");
          setBanner("This email cannot be used.");
        } else if (err.code === "password_too_short") {
          setPasswordError("Password must be at least 8 characters.");
        } else setBanner(mapAuthError(err.code, err.message));
      } else setBanner("Unexpected error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        className="flex-1 bg-surface"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerClassName="p-2 gap-2" keyboardShouldPersistTaps="handled">
          <Text className="font-semibold text-title text-text-primary">Create individual account</Text>
          <Text className="text-body text-text-secondary">
            Create a personal account to track your vehicles.
          </Text>
          {offline ? <Banner tone="warning">You are offline.</Banner> : null}
          {banner ? <Banner>{banner}</Banner> : null}
          <Field label="Email" error={emailError}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              error={Boolean(emailError)}
            />
          </Field>
          <Field label="Password" hint="At least 8 characters." error={passwordError}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={Boolean(passwordError)}
            />
          </Field>
          <Field label="Confirm password" error={confirmError}>
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              error={Boolean(confirmError)}
            />
          </Field>
          <PrimaryButton
            title={busy ? "Creating…" : "Create account"}
            onPress={() => void submit()}
            busy={busy}
            disabled={!canSubmit}
          />
          <Link href="/account-kind" className="text-brand text-label font-medium min-h-hit">
            Back to account type
          </Link>
          <Link href="/sign-in" className="text-brand text-label font-medium min-h-hit">
            Already have an account? Sign in
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
