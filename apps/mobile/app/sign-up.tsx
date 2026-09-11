import { FleetApiError, mapAuthError } from "@fleet/sdk";
import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Banner, Field, PrimaryButton, TextInput } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { searchAddress, type NominatimResult } from "../lib/nominatim";

export default function SignUpScreen() {
  const { applySession, offline } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [address, setAddress] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupResults, setLookupResults] = useState<NominatimResult[]>([]);
  const [lookupNote, setLookupNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [companyError, setCompanyError] = useState("");

  const canSubmit =
    password.length >= 8 &&
    confirm.length >= 8 &&
    Boolean(companyName.trim()) &&
    Boolean(registrationNumber.trim()) &&
    Boolean(vatNumber.trim()) &&
    Boolean(address.trim()) &&
    !offline &&
    !busy;

  useEffect(() => {
    if (address.trim().length < 3) {
      setLookupResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setLookupBusy(true);
      setLookupNote("");
      void searchAddress(address, ctrl.signal)
        .then((rows) => {
          setLookupResults(rows);
          if (!rows.length) setLookupNote("No lookup results. You can keep the address you typed.");
        })
        .catch(() => {
          setLookupResults([]);
          setLookupNote("Address lookup unavailable. Enter the address manually.");
        })
        .finally(() => setLookupBusy(false));
    }, 400);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [address]);

  async function submit() {
    setBanner("");
    setEmailError("");
    setPasswordError("");
    setConfirmError("");
    setCompanyError("");
    if (password !== confirm) {
      setConfirmError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setPasswordError("At least 8 characters.");
      return;
    }
    if (
      !companyName.trim() ||
      !registrationNumber.trim() ||
      !vatNumber.trim() ||
      !address.trim()
    ) {
      setCompanyError("Company name, registration number, VAT number, and address are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.register({
        email: email.trim(),
        password,
        name: companyName.trim(),
        registration_number: registrationNumber.trim(),
        vat_number: vatNumber.trim(),
        address: address.trim(),
      });
      await applySession(res.access_token, res.refresh_token, res.principal, false);
      router.replace("/(owner)");
    } catch (err) {
      if (err instanceof FleetApiError) {
        if (err.code === "email_in_use") {
          setEmailError("This email cannot be used.");
          setBanner("This email cannot be used.");
        } else if (err.code === "password_too_short") setPasswordError(mapAuthError(err.code, err.message));
        else if (err.code === "validation_error") setCompanyError(mapAuthError(err.code, err.message));
        else setBanner(mapAuthError(err.code, err.message));
      } else setBanner("Unexpected error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView className="flex-1 bg-surface" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerClassName="p-2 gap-2" keyboardShouldPersistTaps="handled">
          <Text className="font-semibold text-title text-text-primary">Create company</Text>
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
          <Field label="Password" hint="At least 8 characters" error={passwordError}>
            <TextInput value={password} onChangeText={setPassword} secureTextEntry error={Boolean(passwordError)} />
          </Field>
          <Field label="Confirm password" error={confirmError}>
            <TextInput value={confirm} onChangeText={setConfirm} secureTextEntry error={Boolean(confirmError)} />
          </Field>
          <Field label="Company name" error={companyError}>
            <TextInput value={companyName} onChangeText={setCompanyName} />
          </Field>
          <Field label="Company registration number">
            <TextInput value={registrationNumber} onChangeText={setRegistrationNumber} />
          </Field>
          <Field label="VAT number">
            <TextInput value={vatNumber} onChangeText={setVatNumber} autoCapitalize="characters" />
          </Field>
          <Field
            label="Address"
            hint={
              lookupBusy
                ? "Looking up address…"
                : lookupNote || "Type an address; optional free lookup via OpenStreetMap."
            }
          >
            <TextInput value={address} onChangeText={setAddress} />
          </Field>
          {lookupResults.length > 0 ? (
            <View className="gap-1" accessibilityLabel="Address suggestions">
              {lookupResults.map((r) => (
                <Pressable
                  key={r.display_name}
                  className="min-h-hit px-2 py-2 rounded-md border border-border bg-surface-raised"
                  onPress={() => {
                    setAddress(r.display_name);
                    setLookupResults([]);
                    setLookupNote("");
                  }}
                >
                  <Text className="text-body text-text-primary">{r.display_name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <PrimaryButton title="Create company" onPress={() => void submit()} busy={busy} disabled={!canSubmit} />
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
