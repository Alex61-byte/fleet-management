import { FleetApiError, mapAuthError, type Driver } from "@fleet/sdk";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Banner, DangerButton, Field, PrimaryButton, SecondaryButton, TextInput } from "../../../components/ui";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";

export default function EditDriver() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { offline } = useAuth();
  const router = useRouter();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const d = await api.getDriver(String(id));
        setDriver(d);
        setEmail(d.email);
      } catch (err) {
        if (err instanceof FleetApiError && (err.status === 404 || err.status === 403)) setDenied(true);
        else setError("Could not load driver.");
      }
    })();
  }, [id]);

  async function resendInvite() {
    if (!driver) return;
    setResendBusy(true);
    setResendMsg("");
    setError("");
    try {
      const res = await api.resendDriverInvite(String(id));
      setResendMsg(
        res.invite_email_sent
          ? "Invitation email sent."
          : "Could not send invitation email. Try again.",
      );
    } catch (err) {
      if (err instanceof FleetApiError) setError(mapAuthError(err.code, err.message));
      else setError("Could not resend invitation.");
    } finally {
      setResendBusy(false);
    }
  }

  async function onDeletePermanently() {
    if (deleting || offline) return;
    setDeleting(true);
    setError("");
    try {
      await api.deleteDriver(String(id));
      setConfirmDelete(false);
      router.replace("/(owner)/drivers");
    } catch {
      setConfirmDelete(false);
      setError("Driver could not be deleted.");
    } finally {
      setDeleting(false);
    }
  }

  if (denied) {
    return (
      <View className="flex-1 bg-surface p-2">
        <Stack.Screen options={{ title: "Drivers" }} />
        <Text className="font-semibold text-title">Not allowed</Text>
        <Text className="text-body text-text-secondary">This driver is not available.</Text>
      </View>
    );
  }

  const actionsLocked = offline || busy || deleting;

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-2 gap-2">
      <Stack.Screen options={{ title: "Edit driver" }} />
      {error ? <Banner>{error}</Banner> : null}
      {offline ? <Banner tone="warning">You are offline.</Banner> : null}
      <View className="bg-surface-raised border border-border rounded-lg p-3 gap-2">
        <Field label="Email" error={emailError}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            error={Boolean(emailError)}
            editable={!actionsLocked}
          />
        </Field>
        {driver ? (
          <Text className="text-caption text-text-secondary">
            {!driver.login_enabled
              ? "Login disabled"
              : driver.must_change_password
                ? "Invite pending"
                : "Can sign in"}
          </Text>
        ) : null}
        {confirmDisable ? (
          <View
            className="bg-surface-raised border border-border rounded-md p-2 gap-2"
            accessibilityRole="summary"
            accessibilityLabel="Disable sign-in"
          >
            <Text className="text-body text-text-primary">Disable sign-in? The driver profile is kept.</Text>
            <DangerButton
              title="Disable sign-in"
              disabled={actionsLocked}
              onPress={() => {
                void (async () => {
                  setBusy(true);
                  setError("");
                  try {
                    const next = await api.patchDriver(String(id), { login_enabled: false });
                    setDriver(next);
                    setConfirmDisable(false);
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            />
            <SecondaryButton title="Cancel" disabled={actionsLocked} onPress={() => setConfirmDisable(false)} />
          </View>
        ) : driver?.login_enabled ? (
          <DangerButton
            title="Disable sign-in"
            disabled={actionsLocked}
            onPress={() => setConfirmDisable(true)}
          />
        ) : driver ? (
          <SecondaryButton
            title="Allow mobile sign-in"
            disabled={actionsLocked}
            onPress={() => {
              void (async () => {
                setBusy(true);
                setError("");
                try {
                  const next = await api.patchDriver(String(id), { login_enabled: true });
                  setDriver(next);
                } finally {
                  setBusy(false);
                }
              })();
            }}
          />
        ) : null}
        <PrimaryButton
          title="Save driver"
          busy={busy}
          disabled={offline || deleting}
          onPress={() => {
            void (async () => {
              setEmailError("");
              setError("");
              setBusy(true);
              try {
                await api.patchDriver(String(id), { email });
                router.replace("/(owner)/drivers");
              } catch (err) {
                if (err instanceof FleetApiError && err.code === "email_in_use") {
                  setEmailError("This email cannot be used.");
                }
              } finally {
                setBusy(false);
              }
            })();
          }}
        />
        {driver?.must_change_password ? (
          <View className="gap-1 mt-2">
            <Text className="text-caption text-text-secondary">
              Invite pending — driver has not set a password yet.
            </Text>
            {resendMsg ? <Banner tone="warning">{resendMsg}</Banner> : null}
            <SecondaryButton
              title={resendBusy ? "Sending…" : "Resend invitation"}
              disabled={offline || resendBusy}
              onPress={() => void resendInvite()}
            />
          </View>
        ) : null}
      </View>

      {driver ? (
        <View className="border-t border-divider pt-2 gap-2">
          <Text className="font-semibold text-section text-text-primary" accessibilityRole="header">
            Remove driver
          </Text>
          <Text className="text-caption text-text-secondary">
            Permanently remove this driver from your company. This cannot be undone.
          </Text>
          <DangerButton
            title="Delete driver"
            disabled={actionsLocked}
            onPress={() => {
              setError("");
              setConfirmDelete(true);
            }}
          />
        </View>
      ) : null}

      <Modal
        visible={confirmDelete}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deleting) setConfirmDelete(false);
        }}
      >
        <Pressable
          className="flex-1 bg-surface-overlay justify-end p-3"
          disabled={deleting}
          onPress={() => {
            if (!deleting) setConfirmDelete(false);
          }}
        >
          <Pressable
            className="bg-surface-raised border border-border rounded-lg p-3 gap-2 shadow-overlay"
            onPress={(e) => e.stopPropagation()}
            accessibilityRole="summary"
            accessibilityLabel="Delete driver"
          >
            <Text className="font-semibold text-section text-text-primary">Delete driver?</Text>
            <Text className="text-body text-text-primary">
              {driver?.email} will be removed from your company. They cannot sign in. This cannot be undone.
            </Text>
            <Text className="text-caption text-text-secondary">
              To add them later, create a new driver.
            </Text>
            <SecondaryButton
              title="Cancel"
              disabled={deleting}
              onPress={() => setConfirmDelete(false)}
            />
            <DangerButton
              title={deleting ? "Deleting…" : "Delete permanently"}
              disabled={deleting || offline}
              onPress={() => void onDeletePermanently()}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
