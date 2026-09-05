import { FleetApiError } from "@fleet/sdk";
import * as Clipboard from "expo-clipboard";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { Banner, DangerButton, Field, PrimaryButton, SecondaryButton, TextInput } from "../../../components/ui";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";

type TotpSetup = { otpauth_url: string; secret: string };

export default function SecurityScreen() {
  const { offline, reload } = useAuth();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [setup, setSetup] = useState<TotpSetup | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const [copied, setCopied] = useState(false);
  const [openHint, setOpenHint] = useState("");

  async function load() {
    setError("");
    try {
      setEnabled((await api.totpStatus()).enabled);
    } catch {
      setError("Could not load security settings.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function openAuthenticator() {
    if (!setup?.otpauth_url) return;
    setOpenHint("");
    try {
      const supported = await Linking.canOpenURL(setup.otpauth_url);
      if (!supported) {
        setOpenHint("No authenticator app opened. Copy the setup key below and add it manually.");
        return;
      }
      await Linking.openURL(setup.otpauth_url);
    } catch {
      setOpenHint("Could not open an authenticator app. Copy the setup key below and add it manually.");
    }
  }

  async function copySetupKey() {
    if (!setup?.secret) return;
    await Clipboard.setStringAsync(setup.secret);
    setCopied(true);
  }

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-2 gap-2">
      <Stack.Screen options={{ title: "Security" }} />
      {error ? <Banner>{error}</Banner> : null}
      {enabled === null && !error ? <View className="h-12 bg-disabled-surface rounded-md" /> : null}
      {enabled !== null ? (
        <>
          <View className="bg-surface-raised border border-border rounded-md p-2 min-h-hit flex-row justify-between">
            <Text className="font-medium text-label text-text-primary">Authenticator app</Text>
            <Text className="text-caption text-text-secondary">{enabled ? "On" : "Off"}</Text>
          </View>
          {enabled ? (
            <>
              <Text className="text-body text-text-primary">Sign-in also asks for an authenticator code.</Text>
              {!confirmOff ? (
                <DangerButton title="Turn off authenticator" disabled={offline || busy} onPress={() => setConfirmOff(true)} />
              ) : (
                <View className="bg-surface-raised border border-border rounded-md p-2 gap-2">
                  <Field label="Authenticator code" error={codeError}>
                    <TextInput
                      value={code}
                      onChangeText={setCode}
                      keyboardType="number-pad"
                      autoComplete="one-time-code"
                      textContentType="oneTimeCode"
                      error={Boolean(codeError)}
                    />
                  </Field>
                  <DangerButton
                    title="Turn off"
                    disabled={offline || busy}
                    onPress={() => {
                      void (async () => {
                        setBusy(true);
                        try {
                          await api.totpDisable(code);
                          setEnabled(false);
                          setConfirmOff(false);
                          setCode("");
                          await reload();
                        } catch {
                          setCodeError("That code is not valid.");
                        } finally {
                          setBusy(false);
                        }
                      })();
                    }}
                  />
                  <SecondaryButton title="Cancel" onPress={() => setConfirmOff(false)} />
                </View>
              )}
            </>
          ) : (
            <>
              <Text className="text-body text-text-primary">Sign-in uses email and password only.</Text>
              {!setup ? (
                <PrimaryButton
                  title="Turn on authenticator"
                  busy={busy}
                  disabled={offline}
                  onPress={() => {
                    void (async () => {
                      setBusy(true);
                      setCopied(false);
                      setOpenHint("");
                      try {
                        setSetup(await api.totpSetup());
                      } catch (err) {
                        if (err instanceof FleetApiError) setError(err.message);
                      } finally {
                        setBusy(false);
                      }
                    })();
                  }}
                />
              ) : (
                <View className="bg-surface-raised border border-border rounded-md p-2 gap-2">
                  <Text className="text-body text-text-primary">
                    Add Fleet to your authenticator app, then enter the 6-digit code.
                  </Text>
                  <PrimaryButton title="Open authenticator app" disabled={offline || busy} onPress={() => void openAuthenticator()} />
                  {openHint ? (
                    <Text className="text-caption text-text-secondary" accessibilityLiveRegion="polite">
                      {openHint}
                    </Text>
                  ) : null}
                  <SecondaryButton title="Copy setup key" onPress={() => void copySetupKey()} />
                  {copied ? (
                    <Text className="text-caption text-text-secondary" accessibilityLiveRegion="polite">
                      Key copied
                    </Text>
                  ) : null}
                  <View className="gap-1">
                    <Text className="text-caption text-text-secondary">Setup key</Text>
                    <Text selectable className="text-body text-text-primary font-mono">
                      {setup.secret}
                    </Text>
                  </View>
                  <Field label="Authenticator code" error={codeError}>
                    <TextInput
                      value={code}
                      onChangeText={setCode}
                      keyboardType="number-pad"
                      autoComplete="one-time-code"
                      textContentType="oneTimeCode"
                      error={Boolean(codeError)}
                    />
                  </Field>
                  <PrimaryButton
                    title="Confirm"
                    busy={busy}
                    disabled={offline}
                    onPress={() => {
                      void (async () => {
                        setBusy(true);
                        setCodeError("");
                        try {
                          await api.totpConfirm(code);
                          setEnabled(true);
                          setSetup(null);
                          setCode("");
                          setCopied(false);
                          setOpenHint("");
                          await reload();
                        } catch {
                          setCodeError("That code is not valid.");
                        } finally {
                          setBusy(false);
                        }
                      })();
                    }}
                  />
                </View>
              )}
            </>
          )}
        </>
      ) : null}
    </ScrollView>
  );
}
