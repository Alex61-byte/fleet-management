import { FleetApiError, type DriverTravel } from "@fleet/sdk";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DriverHandoverPanel } from "../../components/driver-handover-panel";
import { Banner, PrimaryButton, SecondaryButton } from "../../components/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";

export default function DriverHandoverScreen() {
  const { offline } = useAuth();
  const [travel, setTravel] = useState<DriverTravel | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const t = await api.getDriverTravel();
      setTravel(t.travel);
    } catch (err) {
      setTravel(null);
      setLoadError(err instanceof FleetApiError ? err.message : "Could not load travel data.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loading = travel === undefined;

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        className="flex-1 bg-surface"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="p-2 gap-2"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="font-semibold text-title text-text-primary" accessibilityRole="header">
            Handover
          </Text>
          <SecondaryButton title="Back to Home" onPress={() => router.replace("/(driver)")} />
          {offline ? <Banner tone="warning">You are offline.</Banner> : null}

          {loadError ? (
            <View className="bg-surface-raised rounded-lg p-2 gap-2 border border-divider">
              <Banner tone="danger">{loadError}</Banner>
              <SecondaryButton title="Retry" onPress={() => void load()} />
            </View>
          ) : loading ? (
            <Text className="text-caption text-text-secondary">Loading…</Text>
          ) : !travel ? (
            <View
              className="bg-surface-raised rounded-lg p-2 gap-2 border border-divider"
              accessibilityLabel="Handover"
            >
              <Text className="font-semibold text-body text-text-primary">Vehicle handover</Text>
              <Text className="text-body text-text-primary">
                Select a vehicle for next travel before you can complete a handover.
              </Text>
              <PrimaryButton title="Go to Next travel" onPress={() => router.push("/(driver)/travel")} />
            </View>
          ) : (
            <DriverHandoverPanel travel={travel} offline={offline} onHandoverSaved={() => void load()} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
