import { FleetApiError, mapAuthError } from "@fleet/sdk";
import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Banner, Field, PrimaryButton, SecondaryButton, TextInput } from "../components/ui";
import { api, apiBase } from "../lib/api";
import { useAuth } from "../lib/auth";
import { takeSessionEndedMessage } from "../lib/tokens";

export default function SignInScreen() {
  const { applySession, offline } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState("");
  const [sessionBanner, setSessionBanner] = useState("");
  const [codeError, setCodeError] = useState("");

  useEffect(() => {
    const msg = takeSessionEndedMessage();
    if (msg) setSessionBanner(msg);
  }, []);

  async function submit() {
    setBanner("");
    setBusy(true);
    try {
      // Password is exact-match (bcrypt); do not trim — only strip accidental leading/trailing spaces users paste.
      const res = await api.login(email.trim(), password.normalize("NFKC"), "mobile");
      if (res.status === "totp_required") {
        setChallenge(res.challenge_token);
      } else {
        await applySession(res.access_token, res.refresh_token, res.principal, false);
        if (res.principal.role === "driver") {
          router.replace("/(driver)");
        } else {
          router.replace("/(owner)");
        }
      }
    } catch (err) {
      if (err instanceof FleetApiError) {
        const mapped = mapAuthError(err.code, err.message || "Sign-in details are not correct.");
        setBanner(
          __DEV__ ? `${mapped} (${err.code || "error"} · ${apiBase})` : mapped,
        );
      } else {
        setBanner(
          __DEV__
            ? `Cannot reach the server at ${apiBase}. Check Wi‑Fi and EXPO_PUBLIC_API_URL.`
            : "Cannot reach the server. Check your connection and API URL.",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitTotp() {
    if (!challenge) return;
    setCodeError("");
    setBusy(true);
    try {
      const res = await api.verifyTotp(challenge, code);
      await applySession(res.access_token, res.refresh_token, res.principal, false);
      router.replace("/(owner)");
    } catch (err) {
      if (err instanceof FleetApiError) {
        setCodeError(mapAuthError(err.code, "That code is not valid."));
      } else {
        setCodeError("Cannot reach the server. Check your connection and API URL.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
    <KeyboardAvoidingView className="flex-1 bg-surface" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerClassName="p-2 gap-2" keyboardShouldPersistTaps="handled">
        {challenge ? (
          <>
            <Text className="font-semibold text-title text-text-primary" accessibilityRole="header">
              Authenticator code
            </Text>
            {offline ? <Banner tone="warning">You are offline.</Banner> : null}
            <Text className="text-body text-text-secondary">
              Enter the 6-digit code from your authenticator app.
            </Text>
            <Field label="Authenticator code" error={codeError}>
              <TextInput
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                error={Boolean(codeError)}
                className="text-title tracking-widest"
              />
            </Field>
            <PrimaryButton title="Continue" onPress={() => void submitTotp()} busy={busy} disabled={offline} />
            <SecondaryButton
              title="Back to sign in"
              onPress={() => {
                setChallenge(null);
                setCode("");
              }}
            />
          </>
        ) : (
          <>
            <Text className="font-semibold text-title text-text-primary" accessibilityRole="header">
              Sign in
            </Text>
            {offline ? <Banner tone="warning">You are offline.</Banner> : null}
            {sessionBanner ? (
              <Banner tone="warning">{sessionBanner}</Banner>
            ) : null}
            {banner ? <Banner>{banner}</Banner> : null}
            <Field label="Email">
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="username"
              />
            </Field>
            <Field label="Password">
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                spellCheck={false}
              />
            </Field>
            <PrimaryButton title="Sign in" onPress={() => void submit()} busy={busy} disabled={offline} />
            {__DEV__ ? (
              <Text className="text-caption text-text-secondary" accessibilityLabel={`API ${apiBase}`}>
                API {apiBase}
              </Text>
            ) : null}
            <Link href="/password-forgot" className="text-brand text-label font-medium min-h-hit">
              Forgot password — Password reset is for Owners and Admins.
            </Link>
            <Link href="/account-kind" className="text-brand text-label font-medium min-h-hit">
              Create account
            </Link>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
