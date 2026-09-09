import {
  FleetApiError,
  formatVehicleMileage,
  odometerUnitLabel,
  type DriverTravel,
  type DriverVehicle,
} from "@fleet/sdk";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Banner, Field, PrimaryButton, SecondaryButton, TextInput } from "../../components/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";

export default function DriverTravelScreen() {
  const { offline } = useAuth();
  const [vehicles, setVehicles] = useState<DriverVehicle[] | null>(null);
  const [travel, setTravel] = useState<DriverTravel | null | undefined>(undefined);
  const [vehicleId, setVehicleId] = useState("");
  const [odometer, setOdometer] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [vRes, t] = await Promise.all([api.listDriverVehicles(), api.getDriverTravel()]);
      const v = vRes.data ?? { items: [] };
      setVehicles(v.items);
      setTravel(t.travel);
      if (t.travel) {
        setVehicleId(t.travel.vehicle_id);
        setOdometer(String(t.travel.odometer));
      } else if (v.items.length === 1) {
        setVehicleId(v.items[0]!.id);
      }
    } catch (err) {
      setVehicles([]);
      setTravel(null);
      setLoadError(err instanceof FleetApiError ? err.message : "Could not load travel data.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => vehicles?.find((v) => v.id === vehicleId) ?? null,
    [vehicles, vehicleId],
  );
  const unit = selected?.odometer_unit ?? travel?.odometer_unit ?? "km";
  const unitLabel = odometerUnitLabel(unit);
  const emptyFleet = vehicles !== null && vehicles.length === 0;
  const loading = vehicles === null || travel === undefined;

  async function onSave() {
    setFormError(null);
    if (!vehicleId) {
      setFormError("Select a vehicle.");
      return;
    }
    if (odometer.trim() === "") {
      setFormError("Enter the odometer reading.");
      return;
    }
    setBusy(true);
    try {
      const saved = await api.putDriverTravel({ vehicle_id: vehicleId, odometer: odometer.trim() });
      setTravel(saved);
      setOdometer(String(saved.odometer));
    } catch (err) {
      setFormError(err instanceof FleetApiError ? err.message : "Could not save selection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface p-2 gap-2">
      <Text className="font-semibold text-title text-text-primary" accessibilityRole="header">
        Next travel
      </Text>
      <SecondaryButton title="Back to Home" onPress={() => router.replace("/(driver)")} />
      {offline ? <Banner tone="warning">You are offline.</Banner> : null}

      <View className="bg-surface-raised rounded-lg p-2 gap-2 border border-divider" accessibilityLabel="Next travel">
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
            {travel ? (
              <View className="gap-0.5">
                <Text className="text-body font-medium text-text-primary">
                  {travel.vehicle?.label ?? "Vehicle"}
                </Text>
                <Text className="text-caption text-text-secondary">
                  {travel.vehicle?.license_plate ?? "—"} · Odometer {travel.odometer} {travel.odometer_unit}
                </Text>
              </View>
            ) : (
              <Text className="text-body text-text-primary">No vehicle selected for your next travel.</Text>
            )}

            {emptyFleet ? (
              <Text className="text-body text-text-primary">
                No vehicles available. Ask your company to add a vehicle.
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
                          onPress={() => setVehicleId(v.id)}
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
                <Field label={`Odometer (${unitLabel.toLowerCase()})`} hint={unitLabel}>
                  <TextInput
                    value={odometer}
                    onChangeText={setOdometer}
                    keyboardType="decimal-pad"
                    editable={!offline && !busy}
                    accessibilityLabel={`Odometer in ${unitLabel.toLowerCase()}`}
                    placeholder="0"
                  />
                </Field>
                {formError ? <Banner tone="danger">{formError}</Banner> : null}
                <PrimaryButton
                  title={travel ? "Update selection" : "Save selection"}
                  onPress={() => void onSave()}
                  disabled={offline || busy || !vehicleId}
                  busy={busy}
                />
              </View>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
