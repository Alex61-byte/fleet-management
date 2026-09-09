import {
  FleetApiError,
  odometerUnitLabel,
  type DailyUsage,
  type DriverTravel,
  type OdometerUnit,
} from "@fleet/sdk";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Banner, Field, PrimaryButton, SecondaryButton, TextInput } from "../../components/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";

function localToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Accept YYYY-MM-DD or common separators (2026.09.07 / 2026/09/07). */
function normalizeUsageDate(raw: string): string {
  const t = raw.trim();
  const m = /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/.exec(t);
  if (!m) return t;
  return `${m[1]}-${m[2]!.padStart(2, "0")}-${m[3]!.padStart(2, "0")}`;
}

function isOneDecimalNonNeg(raw: string): boolean {
  return /^\d+(\.\d)?$/.test(raw.trim());
}

function isHHmm(raw: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(raw.trim());
}

type FieldErrors = {
  usage_date?: string;
  start_place?: string;
  start_distance?: string;
  start_time?: string;
  end_place?: string;
  end_distance?: string;
  end_time?: string;
};

export default function DriverDailyUsageScreen() {
  const { offline } = useAuth();
  const [travel, setTravel] = useState<DriverTravel | null | undefined>(undefined);
  const [items, setItems] = useState<DailyUsage[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  const [usageDate, setUsageDate] = useState(localToday);
  const [startPlace, setStartPlace] = useState("");
  const [startDistance, setStartDistance] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endPlace, setEndPlace] = useState("");
  const [endDistance, setEndDistance] = useState("");
  const [endTime, setEndTime] = useState("");
  const [vehicleMileage, setVehicleMileage] = useState<number | null>(null);
  const [unit, setUnit] = useState<OdometerUnit>("km");

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [t, list] = await Promise.all([
        api.getDriverTravel(),
        api.listDriverDailyUsage(),
      ]);
      setTravel(t.travel);
      setItems(list.items);
      if (t.travel?.vehicle_id) {
        try {
          const vehiclesRes = await api.listDriverVehicles();
          const vehicles = vehiclesRes.data ?? { items: [] as NonNullable<typeof vehiclesRes.data>["items"] };
          const v = vehicles.items.find((x) => x.id === t.travel!.vehicle_id);
          setVehicleMileage(v?.mileage ?? null);
          setUnit(v?.odometer_unit ?? t.travel.odometer_unit ?? "km");
        } catch {
          setVehicleMileage(null);
          setUnit(t.travel.odometer_unit ?? "km");
        }
      } else {
        setVehicleMileage(null);
      }
    } catch (err) {
      setTravel(null);
      setItems([]);
      setLoadError(err instanceof FleetApiError ? err.message : "Could not load daily usage.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unitLabel = odometerUnitLabel(unit);
  const vehicleCaption = useMemo(() => {
    if (!travel?.vehicle) return null;
    return `${travel.vehicle.label} · ${travel.vehicle.license_plate}`;
  }, [travel]);

  function resetFields() {
    setUsageDate(localToday());
    setStartPlace("");
    setStartDistance("");
    setStartTime("");
    setEndPlace("");
    setEndDistance("");
    setEndTime("");
    setFieldErrors({});
  }

  function validate(): boolean {
    const next: FieldErrors = {};
    const date = normalizeUsageDate(usageDate);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      next.usage_date = "Enter a valid date";
    }
    if (!startPlace.trim()) next.start_place = "Enter a start place";
    if (!endPlace.trim()) next.end_place = "Enter an end place";
    if (!startTime.trim()) next.start_time = "Enter a start time";
    else if (!isHHmm(startTime)) next.start_time = "Enter a start time (HH:mm)";
    if (!endTime.trim()) next.end_time = "Enter an end time";
    else if (!isHHmm(endTime)) next.end_time = "Enter an end time (HH:mm)";
    else if (isHHmm(startTime) && endTime.trim() < startTime.trim()) {
      next.end_time = "End time must be at or after start time";
    }
    const sd = startDistance.trim();
    const ed = endDistance.trim();
    if (!sd) next.start_distance = "Enter a non-negative number with at most one decimal";
    else if (!isOneDecimalNonNeg(sd)) {
      next.start_distance = "Enter a non-negative number with at most one decimal";
    } else if (vehicleMileage != null && Number(sd) < vehicleMileage) {
      next.start_distance = "Start distance cannot be lower than the vehicle’s current reading";
    }
    if (!ed) next.end_distance = "Enter a non-negative number with at most one decimal";
    else if (!isOneDecimalNonNeg(ed)) {
      next.end_distance = "Enter a non-negative number with at most one decimal";
    } else if (isOneDecimalNonNeg(sd) && Number(ed) < Number(sd)) {
      next.end_distance = "End distance must be at least the start distance";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit() {
    setFormError(null);
    setSuccessMsg(null);
    if (!validate()) return;
    setBusy(true);
    try {
      await api.createDriverDailyUsage({
        usage_date: normalizeUsageDate(usageDate),
        start_place: startPlace.trim(),
        start_distance: startDistance.trim(),
        start_time: startTime.trim(),
        end_place: endPlace.trim(),
        end_distance: endDistance.trim(),
        end_time: endTime.trim(),
      });
      resetFields();
      setSuccessMsg("Daily usage saved.");
      await load();
    } catch (err) {
      setFormError(err instanceof FleetApiError ? err.message : "Could not save daily usage.");
    } finally {
      setBusy(false);
    }
  }

  const loading = travel === undefined || items === null;
  const inert = offline || busy;

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
            Daily usage
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
          ) : (
            <>
              {!travel ? (
                <View
                  className="bg-surface-raised rounded-lg p-2 gap-2 border border-divider"
                  accessibilityLabel="Daily usage"
                >
                  <Text className="font-semibold text-body text-text-primary">Daily usage</Text>
                  <Text className="text-body text-text-primary">
                    Select next travel first before logging daily usage.
                  </Text>
                  <PrimaryButton
                    title="Go to Next travel"
                    onPress={() => router.push("/(driver)/travel")}
                  />
                </View>
              ) : (
                <View
                  className="bg-surface-raised rounded-lg p-2 gap-2 border border-divider"
                  accessibilityLabel="Log daily usage"
                >
                  <Text className="font-semibold text-body text-text-primary">Log daily usage</Text>
                  {vehicleCaption ? (
                    <Text className="text-caption text-text-secondary">{vehicleCaption}</Text>
                  ) : null}
                  <Text className="text-caption text-text-secondary">Units: {unitLabel}</Text>
                  {successMsg ? (
                    <Text
                      className="text-caption text-text-secondary"
                      accessibilityLiveRegion="polite"
                    >
                      {successMsg}
                    </Text>
                  ) : null}
                  {formError ? <Banner tone="danger">{formError}</Banner> : null}

                  <Field label="Date" error={fieldErrors.usage_date}>
                    <TextInput
                      value={usageDate}
                      onChangeText={setUsageDate}
                      editable={!inert}
                      error={Boolean(fieldErrors.usage_date)}
                      accessibilityLabel="Date"
                      placeholder="YYYY-MM-DD"
                      autoCapitalize="none"
                    />
                  </Field>
                  <Field label="Start place" error={fieldErrors.start_place}>
                    <TextInput
                      value={startPlace}
                      onChangeText={setStartPlace}
                      editable={!inert}
                      error={Boolean(fieldErrors.start_place)}
                      accessibilityLabel="Start place"
                    />
                  </Field>
                  <Field
                    label={`Start distance (${unitLabel})`}
                    error={fieldErrors.start_distance}
                    hint={
                      vehicleMileage != null
                        ? `Must be at least ${vehicleMileage} ${unit}`
                        : undefined
                    }
                  >
                    <TextInput
                      value={startDistance}
                      onChangeText={setStartDistance}
                      keyboardType="decimal-pad"
                      editable={!inert}
                      error={Boolean(fieldErrors.start_distance)}
                      accessibilityLabel={`Start distance (${unitLabel})`}
                    />
                  </Field>
                  <Field label="Start time" error={fieldErrors.start_time}>
                    <TextInput
                      value={startTime}
                      onChangeText={setStartTime}
                      editable={!inert}
                      error={Boolean(fieldErrors.start_time)}
                      accessibilityLabel="Start time"
                      placeholder="HH:mm"
                      autoCapitalize="none"
                    />
                  </Field>
                  <Field label="End place" error={fieldErrors.end_place}>
                    <TextInput
                      value={endPlace}
                      onChangeText={setEndPlace}
                      editable={!inert}
                      error={Boolean(fieldErrors.end_place)}
                      accessibilityLabel="End place"
                    />
                  </Field>
                  <Field
                    label={`End distance (${unitLabel})`}
                    error={fieldErrors.end_distance}
                  >
                    <TextInput
                      value={endDistance}
                      onChangeText={setEndDistance}
                      keyboardType="decimal-pad"
                      editable={!inert}
                      error={Boolean(fieldErrors.end_distance)}
                      accessibilityLabel={`End distance (${unitLabel})`}
                    />
                  </Field>
                  <Field label="End time" error={fieldErrors.end_time}>
                    <TextInput
                      value={endTime}
                      onChangeText={setEndTime}
                      editable={!inert}
                      error={Boolean(fieldErrors.end_time)}
                      accessibilityLabel="End time"
                      placeholder="HH:mm"
                      autoCapitalize="none"
                    />
                  </Field>
                  <PrimaryButton
                    title={busy ? "Submitting…" : "Submit daily usage"}
                    onPress={() => void onSubmit()}
                    disabled={inert}
                    busy={busy}
                  />
                </View>
              )}

              <View
                className="bg-surface-raised rounded-lg p-2 gap-2 border border-divider"
                accessibilityLabel="Your daily usage"
              >
                <Text className="font-semibold text-body text-text-primary">Your entries</Text>
                {items!.length === 0 ? (
                  <Text className="text-caption text-text-secondary">
                    No daily usage entries yet.
                  </Text>
                ) : (
                  <>
                    <Text className="text-caption text-text-secondary">
                      {items!.length} {items!.length === 1 ? "entry" : "entries"}
                    </Text>
                    {items!.map((row) => (
                      <View key={row.id} className="gap-0.5 py-1 border-t border-divider">
                        <Text className="text-body font-medium text-text-primary">
                          {row.usage_date} · {row.vehicle?.label ?? "Vehicle"} ·{" "}
                          {row.vehicle?.license_plate ?? "—"}
                        </Text>
                        <Text className="text-caption text-text-secondary">
                          {row.start_place} → {row.end_place}
                        </Text>
                        <Text className="text-caption text-text-secondary">
                          {row.start_distance}–{row.end_distance} {row.distance_unit} ·{" "}
                          {row.start_time}–{row.end_time}
                        </Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
