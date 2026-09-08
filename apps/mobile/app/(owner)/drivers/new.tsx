import { FleetApiError, mapAuthError } from "@fleet/sdk";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { Banner, Field, PrimaryButton, PrimaryLink, TextInput } from "../../../components/ui";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";

export default function NewDriver() {
  const { offline, me } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [banner, setBanner] = useState("");

  if (me?.account_kind === "individual") {
    return (
      <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-2 gap-2">
        <Stack.Screen options={{ title: "Add driver" }} />
        <Text className="font-semibold text-title text-text-primary">Not available</Text>
        <Text className="text-body text-text-secondary">
          Driver management is only available on company accounts.
        </Text>
        <PrimaryLink href="/(owner)" title="Back to home" />
      </ScrollView>
    );
  }

  async function submit() {
    setEmailError("");
    setBanner("");
    setBusy(true);
    try {
      const created = await api.createDriver(email.trim());
      if (!created.invite_email_sent) {
        setBanner("Driver created, but the invitation email could not be sent. Resend from the driver profile.");
      }
      router.replace("/(owner)/drivers");
    } catch (err) {
      if (err instanceof FleetApiError) {
        if (err.code === "email_in_use") setEmailError("This email cannot be used.");
        else setBanner(mapAuthError(err.code, err.message));
      } else setBanner("Unexpected error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-2 gap-2">
      <Stack.Screen options={{ title: "Add driver" }} />
      {banner ? <Banner>{banner}</Banner> : null}
      <Field
        label="Email"
        hint="We email an invitation so the driver can set their own password. No temporary password."
        error={emailError}
      >
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          error={Boolean(emailError)}
          editable={!busy}
        />
      </Field>
      <Text className="text-caption text-text-secondary">
        The driver opens the invite link and creates a password on web or mobile.
      </Text>
      <PrimaryButton
        title="Send invitation"
        onPress={() => void submit()}
        busy={busy}
        disabled={offline || !email.trim()}
      />
    </ScrollView>
  );
}
