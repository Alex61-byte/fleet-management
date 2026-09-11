import { FleetApiError, mapAuthError } from "@fleet/sdk";
import { useEffect, useState } from "react";
import { Modal, Text, View } from "react-native";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Banner, Field, PrimaryButton, TextInput } from "./ui";

/** Blocking prompt for company Owners missing a display name. */
export function CompanyNameDialog() {
  const { me, offline, reload } = useAuth();
  const open = Boolean(me?.company_name_required);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState("");

  useEffect(() => {
    if (!open) {
      setName("");
      setError("");
      setBanner("");
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  async function submit() {
    setError("");
    setBanner("");
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Company name is required.");
      return;
    }
    if (offline) {
      setBanner("You are offline.");
      return;
    }
    setBusy(true);
    try {
      await api.setCompanyName({ name: trimmed });
      await reload();
    } catch (err) {
      if (err instanceof FleetApiError) {
        if (err.code === "validation_error") setError(mapAuthError(err.code, err.message));
        else if (err.code === "forbidden") setBanner("Only the company Owner can set the company name.");
        else setBanner(mapAuthError(err.code, err.message));
      } else setBanner("Unexpected error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => undefined}>
      <View className="flex-1 bg-surface-overlay items-center justify-center p-3">
        <View className="w-full max-w-[400px] rounded-md border border-border bg-surface-raised p-3 gap-2">
          <Text className="font-semibold text-title text-text-primary">Add company name</Text>
          <Text className="text-body text-text-secondary">
            Your company account needs a display name. Enter it once — it identifies your workspace
            across Fleet.
          </Text>
          {offline ? <Banner tone="warning">You are offline.</Banner> : null}
          {banner ? <Banner>{banner}</Banner> : null}
          <Field label="Company name" error={error}>
            <TextInput value={name} onChangeText={setName} editable={!busy && !offline} />
          </Field>
          <PrimaryButton
            title="Save company name"
            onPress={() => void submit()}
            busy={busy}
            disabled={busy || offline || !name.trim()}
          />
        </View>
      </View>
    </Modal>
  );
}
