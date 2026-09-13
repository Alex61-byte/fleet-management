import {
  FleetApiError,
  formatVehicleMileage,
  odometerUnitLabel,
  type DriverTravel,
  type DriverVehicle,
} from "@fleet/sdk";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Banner, Field, PrimaryButton, SecondaryButton } from "../../components/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";

export default function DriverTravelScreen() {
  const { offline } = useAuth();
  const [vehicles, setVehicles] = useState<DriverVehicle[] | null>(null);
  const [travel, setTravel] = useState<DriverTravel | null | undefined>(undefined);
  const [vehicleId, setVehicleId] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [vRes, t, h] = await Promise.all([
        api.listDriverVehicles(),
        api.getDriverTravel(),
        api.getDriverActiveHandover().catch(() => ({ handover: null })),
      ]);
      // Open Out locks next travel — finish Handover In first.
      if (h.handover) {
        router.replace("/(driver)/handover");
        return;
      }
      const v = vRes.data ?? { items: [] };
      setVehicles(v.items);
      setTravel(t.travel);
      // Prefill only when the active selection is still available (not open Out).
      const activeStillAvailable =
        t.travel != null && v.items.some((item) => item.id === t.travel!.vehicle_id);
      if (activeStillAvailable) {
        setVehicleId(t.travel!.vehicle_id);
      } else {
        setVehicleId("");
      }
    } catch (err) {
      setVehicles([]);
      setTravel(null);
      setVehicleId("");
      setLoadError(err instanceof FleetApiError ? err.message : "Could not load travel data.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const emptyFleet = vehicles !== null && vehicles.length === 0;
  const loading = vehicles === null || travel === undefined;
  const selectedAvailable =
    travel != null && vehicles != null && vehicles.some((v) => v.id === travel.vehicle_id);

  async function onSave() {
    setFormError(null);
    if (!vehicleId) {
      setFormError("Select a vehicle.");
      return;
    }
    const selected = vehicles?.find((v) => v.id === vehicleId);
    if (!selected) {
      setFormError("Select an available vehicle.");
      return;
    }
    setBusy(true);
    try {
      // Odometer is captured on handover; travel binds vehicle only (use known mileage or 0).
      const odometer = selected.mileage != null ? String(selected.mileage) : "0";
      await api.putDriverTravel({ vehicle_id: vehicleId, odometer });
      router.replace("/(driver)/handover");
    } catch (err) {
      setFormError(err instanceof FleetApiError ? err.message : "Could not save selection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        className="flex-1 bg-surface"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="grow p-2"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          onScrollBeginDrag={Keyboard.dismiss}
        >
          <Pressable accessible={false} onPress={Keyboard.dismiss} className="min-h-full gap-2">
            <Text className="font-semibold text-title text-text-primary" accessibilityRole="header">
              Next travel
            </Text>
            <SecondaryButton title="Back to Home" onPress={() => router.replace("/(driver)")} />
            {offline ? <Banner tone="warning">You are offline.</Banner> : null}

            <View
              className="bg-surface-raised rounded-lg p-2 gap-2 border border-divider"
              accessibilityLabel="Next travel"
            >
              <Text className="font-semibold text-body text-text-primary">Next travel</Text>
              {loadError ? (
                <>
                  <Banner tone="danger">{loadError}</Banner>
                  <SecondaryButton title="Retry" onPress={() => void load()} />
                </>
              ) : loading ? (
                <Text className="text-caption text-text-secondary">Loading…</Text>
              ) : (
                <>
                  {selectedAvailable && travel ? (
                    <View className="gap-0.5">
                      <Text className="text-body font-medium text-text-primary">
                        {travel.vehicle?.label ?? "Vehicle"}
                      </Text>
                      <Text className="text-caption text-text-secondary">
                        {travel.vehicle?.license_plate ?? "—"}
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-body text-text-primary">
                      Select an available vehicle, then complete handover with odometer and service
                      data.
                    </Text>
                  )}

                  {emptyFleet ? (
                    <Text className="text-body text-text-primary">
                      No vehicles available. Ask your company to add a vehicle, or wait until
                      Handover In is completed.
                    </Text>
                  ) : (
                    <View className="gap-2">
                      <Field label="Vehicle for next travel">
                        <View className="gap-1">
                          {vehicles!.map((v) => {
                            const on = v.id === vehicleId;
                            return (
                              <Pressable
                                key={v.id}
                                accessibilityRole="button"
                                accessibilityState={{ selected: on }}
                                accessibilityLabel={`${v.label}, ${v.license_plate}`}
                                onPress={() => {
                                  Keyboard.dismiss();
                                  setVehicleId(v.id);
                                }}
                                disabled={offline || busy}
                                className={`rounded-md border px-2 py-2 ${
                                  on ? "border-brand-accent bg-surface" : "border-divider bg-surface"
                                }`}
                              >
                                <Text className="text-body text-text-primary">
                                  {v.label} · {v.license_plate}
                                </Text>
                                <Text className="text-caption text-text-secondary">
                                  {odometerUnitLabel(v.odometer_unit)}
                                  {v.mileage != null
                                    ? ` · ${formatVehicleMileage(v.mileage, v.mileage_unit ?? v.odometer_unit)}`
                                    : ""}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </Field>
                      {formError ? <Banner tone="danger">{formError}</Banner> : null}
                      <PrimaryButton
                        title="Continue to handover"
                        onPress={() => {
                          Keyboard.dismiss();
                          void onSave();
                        }}
                        disabled={offline || busy || !vehicleId}
                        busy={busy}
                      />
                    </View>
                  )}
                </>
              )}
            </View>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
