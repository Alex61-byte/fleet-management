import { FleetApiError, mapAuthError } from "@fleet/sdk";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Banner, Field, PrimaryButton, TextInput } from "./ui";

/** Blocking prompt for drivers missing first/last name (US-121). */
export function DriverNameDialog() {
  const { me, offline, reload } = useAuth();
  const open = Boolean(me?.driver_name_required);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [secondLastName, setSecondLastName] = useState("");
  const [busy, setBusy] = useState(false);
  const [firstError, setFirstError] = useState("");
  const [lastError, setLastError] = useState("");
  const [banner, setBanner] = useState("");

  useEffect(() => {
    if (!open) {
      setFirstName("");
      setLastName("");
      setSecondLastName("");
      setFirstError("");
      setLastError("");
      setBanner("");
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  async function submit() {
    setFirstError("");
    setLastError("");
    setBanner("");
    const first = firstName.trim();
    const last = lastName.trim();
    const second = secondLastName.trim();
    let invalid = false;
    if (!first) {
      setFirstError("Name is required.");
      invalid = true;
    }
    if (!last) {
      setLastError("Last Name is required.");
      invalid = true;
    }
    if (invalid) return;
    if (offline) {
      setBanner("You are offline.");
      return;
    }
    setBusy(true);
    try {
      await api.setMyName({
        first_name: first,
        last_name: last,
        second_last_name: second,
      });
      await reload();
    } catch (err) {
      if (err instanceof FleetApiError) {
        if (err.code === "validation_error") setBanner(mapAuthError(err.code, err.message));
        else if (err.code === "forbidden") setBanner("Only you can set your name.");
        else setBanner(mapAuthError(err.code, err.message));
      } else setBanner("Unexpected error.");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = Boolean(firstName.trim() && lastName.trim()) && !busy && !offline;
  const fieldProps = {
    editable: !busy && !offline,
    returnKeyType: "next" as const,
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => undefined}>
      <KeyboardAvoidingView
        className="flex-1 bg-surface-overlay"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow justify-center p-3"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
        >
          <View className="w-full max-w-[400px] self-center rounded-md border border-border bg-surface-raised p-3 gap-2">
            <Text className="font-semibold text-title text-text-primary">Add your name</Text>
            <Text className="text-body text-text-secondary">
              Enter your name to continue. This is required before using driver features.
            </Text>
            {offline ? <Banner tone="warning">You are offline.</Banner> : null}
            {banner ? <Banner>{banner}</Banner> : null}
            <Field label="Name" error={firstError}>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                autoComplete="given-name"
                textContentType="givenName"
                {...fieldProps}
              />
            </Field>
            <Field label="Last Name" error={lastError}>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                autoComplete="family-name"
                textContentType="familyName"
                {...fieldProps}
              />
            </Field>
            <Field label="Second Last Name">
              <TextInput
                value={secondLastName}
                onChangeText={setSecondLastName}
                editable={!busy && !offline}
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (canSubmit) void submit();
                }}
              />
            </Field>
            <PrimaryButton
              title="Save"
              onPress={() => void submit()}
              busy={busy}
              disabled={!canSubmit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
