import { FleetApiError, type DriverTravel, type HandoverActive } from "@fleet/sdk";
import { Link } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Banner, SecondaryButton } from "../../components/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";

/**
 * Driver start / hub after login (US-10).
 * Does not open next-travel or handover forms until the driver chooses them.
 */
export default function DriverHome() {
  const { me, signOut, offline } = useAuth();
  const [travel, setTravel] = useState<DriverTravel | null | undefined>(undefined);
  const [activeOut, setActiveOut] = useState<HandoverActive | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const t = await api.getDriverTravel();
      setTravel(t.travel);
      if (t.travel) {
        try {
          const h = await api.getDriverActiveHandover();
          setActiveOut(h.handover);
        } catch {
          setActiveOut(null);
        }
      } else {
        setActiveOut(null);
      }
    } catch (err) {
      setTravel(null);
      setActiveOut(null);
      setLoadError(err instanceof FleetApiError ? err.message : "Could not load home.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loading = travel === undefined;

  return (
    <SafeAreaView className="flex-1 bg-surface p-2 gap-2">
      <Text className="font-semibold text-title text-text-primary" accessibilityRole="header">
        Home
      </Text>
      {offline ? <Banner tone="warning">You are offline.</Banner> : null}

      <View className="bg-surface-raised rounded-lg p-2 gap-1 border border-divider" accessibilityLabel="Driver profile">
        <Text className="text-caption uppercase text-text-secondary">Driver</Text>
        <Text className="text-body font-medium text-text-primary">{me?.email}</Text>
        <Text className="text-caption text-text-secondary mt-1">
          Choose what you need. Handover is not opened until you start it.
        </Text>
      </View>

      {loadError ? (
        <View className="bg-surface-raised rounded-lg p-2 gap-2 border border-divider">
          <Banner tone="danger">{loadError}</Banner>
          <SecondaryButton title="Retry" onPress={() => void load()} />
        </View>
      ) : loading ? (
        <Text className="text-caption text-text-secondary">Loading…</Text>
      ) : (
        <View className="gap-2" accessibilityLabel="Driver start">
          <Link href="/(driver)/travel" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                travel
                  ? `Next travel. Selected. ${travel.vehicle?.label ?? "Vehicle"}, ${travel.vehicle?.license_plate ?? ""}`
                  : "Next travel. Select a vehicle and odometer for your next travel."
              }
              className="bg-surface-raised rounded-lg p-2 gap-1 border border-divider"
            >
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1 gap-0.5">
                  <Text className="text-body font-medium text-text-primary">Next travel</Text>
                  <Text className="text-caption text-text-secondary">
                    {travel
                      ? `${travel.vehicle?.label ?? "Vehicle"} · ${travel.vehicle?.license_plate ?? "—"}`
                      : "Select a vehicle and odometer for your next travel."}
                  </Text>
                </View>
                {travel ? (
                  <Text className="text-caption text-text-secondary">Selected</Text>
                ) : (
                  <Text className="text-caption text-text-secondary" accessibilityElementsHidden>
                    →
                  </Text>
                )}
              </View>
            </Pressable>
          </Link>

          <Link href="/(driver)/handover" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                !travel
                  ? "Vehicle handover. Select next travel first, then complete Out or In."
                  : activeOut
                    ? "Vehicle handover. Out is open. Complete Handover In when you return."
                    : "Vehicle handover. Record Handover Out when you take the vehicle, or In when you return."
              }
              className="bg-surface-raised rounded-lg p-2 gap-1 border border-divider"
            >
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1 gap-0.5">
                  <Text className="text-body font-medium text-text-primary">Vehicle handover</Text>
                  <Text className="text-caption text-text-secondary">
                    {!travel
                      ? "Select next travel first, then complete Out or In."
                      : activeOut
                        ? "Out is open — complete Handover In when you return."
                        : "Record Handover Out when you take the vehicle, or In when you return."}
                  </Text>
                </View>
                {activeOut ? (
                  <Text className="text-caption font-medium text-text-primary">Out open</Text>
                ) : travel ? (
                  <Text className="text-caption text-text-secondary">Ready</Text>
                ) : (
                  <Text className="text-caption text-text-secondary" accessibilityElementsHidden>
                    →
                  </Text>
                )}
              </View>
            </Pressable>
          </Link>

          <Link href="/(driver)/daily-usage" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                travel
                  ? "Daily usage. Log date, places, distances, and times for today’s use."
                  : "Daily usage. Select next travel first, then log daily usage."
              }
              className="bg-surface-raised rounded-lg p-2 gap-1 border border-divider"
            >
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1 gap-0.5">
                  <Text className="text-body font-medium text-text-primary">Daily usage</Text>
                  <Text className="text-caption text-text-secondary">
                    {travel
                      ? "Log date, places, distances, and times for today’s use."
                      : "Select next travel first, then log daily usage."}
                  </Text>
                </View>
                {travel ? (
                  <Text className="text-caption text-text-secondary">Ready</Text>
                ) : (
                  <Text className="text-caption text-text-secondary" accessibilityElementsHidden>
                    →
                  </Text>
                )}
              </View>
            </Pressable>
          </Link>
        </View>
      )}

      <SecondaryButton title="Sign out" onPress={() => void signOut()} />
    </SafeAreaView>
  );
}
