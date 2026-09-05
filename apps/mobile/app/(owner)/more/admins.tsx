import { FleetApiError, mapAuthError } from "@fleet/sdk";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Banner, Field, PrimaryButton, TextInput } from "../../../components/ui";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";

type Admin = { id: string; email: string; role: "admin" };

export default function AdminsScreen() {
  const { me, offline } = useAuth();
  const [items, setItems] = useState<Admin[] | null>(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [banner, setBanner] = useState("");

  async function load() {
    setError("");
    try {
      setItems((await api.listAdmins()).items);
    } catch (err) {
      if (err instanceof FleetApiError && err.status === 403) setError("forbidden");
      else setError("Could not load Admins.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (me && me.role !== "owner") {
    return (
      <View className="flex-1 bg-surface p-2 gap-2">
        <Stack.Screen options={{ title: "Admins" }} />
        <Text className="font-semibold text-title text-text-primary">Not allowed</Text>
        <Text className="text-body text-text-secondary">Only the Owner can add Admins.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-2 gap-2">
      <Stack.Screen options={{ title: "Admins" }} />
      {error === "forbidden" ? (
        <>
          <Text className="font-semibold text-title">Not allowed</Text>
          <Text className="text-body text-text-secondary">Only the Owner can add Admins.</Text>
        </>
      ) : error ? (
        <Banner>{error}</Banner>
      ) : items && items.length === 0 ? (
        <Text className="text-body text-text-primary">No Admins yet.</Text>
      ) : (
        items?.map((a) => (
          <View key={a.id} className="bg-surface-raised border border-border rounded-md p-2 min-h-hit">
            <Text className="font-medium text-label text-text-primary">{a.email}</Text>
            <Text className="text-caption text-text-secondary">Admin</Text>
          </View>
        ))
      )}
      {!showForm ? (
        <PrimaryButton title="Add Admin" onPress={() => setShowForm(true)} />
      ) : (
        <View className="gap-2">
          {banner ? <Banner>{banner}</Banner> : null}
          <Field label="Email" error={emailError}>
            <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" error={Boolean(emailError)} />
          </Field>
          <Field label="Password" hint="At least 8 characters" error={passwordError}>
            <TextInput value={password} onChangeText={setPassword} secureTextEntry error={Boolean(passwordError)} />
          </Field>
          <Field label="Confirm password">
            <TextInput value={confirm} onChangeText={setConfirm} secureTextEntry />
          </Field>
          <PrimaryButton
            title="Create Admin"
            busy={busy}
            disabled={offline}
            onPress={() => {
              void (async () => {
                setEmailError("");
                setPasswordError("");
                setBanner("");
                if (password !== confirm) {
                  setPasswordError("Passwords do not match.");
                  return;
                }
                setBusy(true);
                try {
                  await api.createAdmin(email, password);
                  setShowForm(false);
                  setEmail("");
                  setPassword("");
                  setConfirm("");
                  await load();
                } catch (err) {
                  if (err instanceof FleetApiError) {
                    if (err.code === "email_in_use") setEmailError("This email cannot be used.");
                    else if (err.code === "password_too_short") setPasswordError(mapAuthError(err.code, err.message));
                    else setBanner(mapAuthError(err.code, err.message));
                  }
                } finally {
                  setBusy(false);
                }
              })();
            }}
          />
        </View>
      )}
    </ScrollView>
  );
}
