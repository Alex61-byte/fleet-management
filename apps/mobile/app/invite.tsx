import { FleetApiError, mapAuthError } from "@fleet/sdk";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Banner, Field, PrimaryButton, TextInput } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function InviteAcceptScreen() {
  const { applySession, offline } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = String(params.token ?? "").trim();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [resolving, setResolving] = useState(Boolean(token));
  const [blocked, setBlocked] = useState(!token);
  const [banner, setBanner] = useState(!token ? "This invitation link is invalid or has expired." : "");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setResolving(true);
      try {
        const preview = await api.previewInvite(token);
        if (cancelled) return;
        setEmail(preview.email);
        setBlocked(false);
        setBanner("");
      } catch (err) {
        if (cancelled) return;
        setBlocked(true);
        if (err instanceof FleetApiError && err.code === "login_disabled") {
          setBanner(mapAuthError(err.code, err.message));
        } else {
          setBanner("This invitation link is invalid or has expired.");
        }
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function submit() {
    setPasswordError("");
    setConfirmError("");
    if (password !== confirm) {
      setConfirmError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    setBanner("");
    try {
      const res = await api.acceptInvite({
        token,
        email: email.trim(),
        password,
        client: "mobile",
      });
      await applySession(res.access_token, res.refresh_token, res.principal, false);
      router.replace("/(driver)");
    } catch (err) {
      if (err instanceof FleetApiError) {
        if (err.code === "password_too_short") setPasswordError(mapAuthError(err.code, err.message));
        else if (err.code === "email_not_invited") {
          setBlocked(true);
          setBanner("This invitation is not valid for that email.");
        } else if (err.code === "invite_invalid") {
          setBlocked(true);
          setBanner("This invitation link is invalid or has expired.");
        } else setBanner(mapAuthError(err.code, err.message));
      } else setBanner("Unexpected error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView className="flex-1 bg-surface" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerClassName="p-2 gap-2" keyboardShouldPersistTaps="handled">
          <Text className="font-semibold text-title text-text-primary">Accept invitation</Text>
          <Text className="text-body text-text-secondary">Set your password to continue.</Text>
          {offline ? <Banner tone="warning">You are offline.</Banner> : null}
          {banner ? <Banner>{banner}</Banner> : null}
          {resolving ? <Text className="text-caption text-text-secondary">Checking invitation…</Text> : null}
          {!resolving && !blocked ? (
            <>
              <Field label="Email">
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!busy}
                />
              </Field>
              <Field label="Password" hint="At least 8 characters" error={passwordError}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  error={Boolean(passwordError)}
                  editable={!busy}
                />
              </Field>
              <Field label="Confirm password" error={confirmError}>
                <TextInput
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry
                  error={Boolean(confirmError)}
                  editable={!busy}
                />
              </Field>
              <PrimaryButton
                title="Set password"
                onPress={() => void submit()}
                busy={busy}
                disabled={offline || busy}
              />
            </>
          ) : null}
          {blocked ? (
            <Link href="/sign-in" className="text-brand text-label font-medium min-h-hit">
              Back to sign in
            </Link>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
