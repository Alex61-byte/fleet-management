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

type StartErrors = {
  usage_date?: string;
  start_place?: string;
  start_distance?: string;
  start_time?: string;
  refuel_amount?: string;
  refuel_at_mileage?: string;
};

type EndErrors = {
  end_place?: string;
  end_distance?: string;
  end_time?: string;
  refuel_amount?: string;
  refuel_at_mileage?: string;
};

export default function DriverDailyUsageScreen() {
  const { offline } = useAuth();
  const [travel, setTravel] = useState<DriverTravel | null | undefined>(undefined);
  const [items, setItems] = useState<DailyUsage[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [endError, setEndError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [startFieldErrors, setStartFieldErrors] = useState<StartErrors>({});
  const [endFieldErrors, setEndFieldErrors] = useState<EndErrors>({});
  const [startBusy, setStartBusy] = useState(false);
  const [endBusy, setEndBusy] = useState(false);

  const [usageDate, setUsageDate] = useState(localToday);
  const [startPlace, setStartPlace] = useState("");
  const [startDistance, setStartDistance] = useState("");
  const [startTime, setStartTime] = useState("");
  const [startRefuelAmount, setStartRefuelAmount] = useState("");
  const [startRefuelAt, setStartRefuelAt] = useState("");
  const [endPlace, setEndPlace] = useState("");
  const [endDistance, setEndDistance] = useState("");
  const [endTime, setEndTime] = useState("");
  const [endRefuelAmount, setEndRefuelAmount] = useState("");
  const [endRefuelAt, setEndRefuelAt] = useState("");
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
          const vehicles = vehiclesRes.data ?? {
            items: [] as NonNullable<typeof vehiclesRes.data>["items"],
          };
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
  const fuelUnit = unit === "mi" ? "gal" : "L";
  const vehicleCaption = useMemo(() => {
    if (!travel?.vehicle) return null;
    return `${travel.vehicle.label} · ${travel.vehicle.license_plate}`;
  }, [travel]);

  const openRow = useMemo(
    () => items?.find((u) => u.status === "open") ?? null,
    [items],
  );

  const minStartDistance = useMemo(() => {
    const floors: number[] = [];
    if (vehicleMileage != null) floors.push(vehicleMileage);
    const vehicleId = travel?.vehicle_id;
    if (vehicleId && items) {
      const last = items.find(
        (u) => u.vehicle_id === vehicleId && u.status === "closed" && u.end_distance != null,
      );
      if (last?.end_distance != null) floors.push(last.end_distance);
    }
    return floors.length > 0 ? Math.max(...floors) : null;
  }, [vehicleMileage, travel?.vehicle_id, items]);

  useEffect(() => {
    if (minStartDistance == null || openRow) return;
    setStartDistance((prev) => (prev.trim() === "" ? String(minStartDistance) : prev));
  }, [minStartDistance, openRow]);

  function resetStartFields(nextMinStart: number | null = minStartDistance) {
    setUsageDate(localToday());
    setStartPlace("");
    setStartDistance(nextMinStart != null ? String(nextMinStart) : "");
    setStartTime("");
    setStartRefuelAmount("");
    setStartRefuelAt("");
    setStartFieldErrors({});
  }

  function resetEndFields() {
    setEndPlace("");
    setEndDistance("");
    setEndTime("");
    setEndRefuelAmount("");
    setEndRefuelAt("");
    setEndFieldErrors({});
  }

  function validateOptionalRefuel(amount: string, at: string): { amount?: string; at?: string } {
    const out: { amount?: string; at?: string } = {};
    if (amount.trim() && !isOneDecimalNonNeg(amount)) {
      out.amount = "Enter a non-negative number with at most one decimal";
    }
    if (at.trim() && !isOneDecimalNonNeg(at)) {
      out.at = "Enter a non-negative number with at most one decimal";
    }
    return out;
  }

  function validateStart(): boolean {
    const next: StartErrors = {};
    const date = normalizeUsageDate(usageDate);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) next.usage_date = "Enter a valid date";
    if (!startPlace.trim()) next.start_place = "Enter a start place";
    if (!startTime.trim()) next.start_time = "Enter a start time";
    else if (!isHHmm(startTime)) next.start_time = "Enter a start time (HH:mm)";
    const sd = startDistance.trim();
    if (!sd) next.start_distance = "Enter a non-negative number with at most one decimal";
    else if (!isOneDecimalNonNeg(sd)) {
      next.start_distance = "Enter a non-negative number with at most one decimal";
    } else if (minStartDistance != null && Number(sd) < minStartDistance) {
      next.start_distance = "Start distance cannot be lower than the last recorded end distance";
    }
    const ref = validateOptionalRefuel(startRefuelAmount, startRefuelAt);
    if (ref.amount) next.refuel_amount = ref.amount;
    if (ref.at) next.refuel_at_mileage = ref.at;
    setStartFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  function validateEnd(open: DailyUsage): boolean {
    const next: EndErrors = {};
    if (!endPlace.trim()) next.end_place = "Enter an end place";
    if (!endTime.trim()) next.end_time = "Enter an end time";
    else if (!isHHmm(endTime)) next.end_time = "Enter an end time (HH:mm)";
    else if (endTime.trim() < open.start_time) {
      next.end_time = "End time must be at or after start time";
    }
    const ed = endDistance.trim();
    if (!ed) next.end_distance = "Enter a non-negative number with at most one decimal";
    else if (!isOneDecimalNonNeg(ed)) {
      next.end_distance = "Enter a non-negative number with at most one decimal";
    } else if (Number(ed) < open.start_distance) {
      next.end_distance = "End distance must be at least the start distance";
    }
    const ref = validateOptionalRefuel(endRefuelAmount, endRefuelAt);
    if (ref.amount) next.refuel_amount = ref.amount;
    if (ref.at) next.refuel_at_mileage = ref.at;
    setEndFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onStartSubmit() {
    setStartError(null);
    setSuccessMsg(null);
    if (!validateStart()) return;
    setStartBusy(true);
    try {
      const body: Parameters<typeof api.createDriverDailyUsage>[0] = {
        usage_date: normalizeUsageDate(usageDate),
        start_place: startPlace.trim(),
        start_distance: startDistance.trim(),
        start_time: startTime.trim(),
      };
      if (startRefuelAmount.trim()) body.refuel_amount = startRefuelAmount.trim();
      if (startRefuelAt.trim()) body.refuel_at_mileage = startRefuelAt.trim();
      await api.createDriverDailyUsage(body);
      resetStartFields(minStartDistance);
      setSuccessMsg("Day Start saved.");
      await load();
    } catch (err) {
      setStartError(err instanceof FleetApiError ? err.message : "Could not save Day Start.");
    } finally {
      setStartBusy(false);
    }
  }

  async function onEndSubmit() {
    setEndError(null);
    setSuccessMsg(null);
    if (!openRow || !validateEnd(openRow)) return;
    setEndBusy(true);
    try {
      const body: Parameters<typeof api.endDriverDailyUsage>[0] = {
        end_place: endPlace.trim(),
        end_distance: endDistance.trim(),
        end_time: endTime.trim(),
      };
      if (endRefuelAmount.trim()) body.refuel_amount = endRefuelAmount.trim();
      if (endRefuelAt.trim()) body.refuel_at_mileage = endRefuelAt.trim();
      await api.endDriverDailyUsage(body);
      const savedEnd = Number(endDistance.trim());
      resetEndFields();
      resetStartFields(Number.isFinite(savedEnd) ? savedEnd : minStartDistance);
      setSuccessMsg("End of Day saved.");
      await load();
    } catch (err) {
      setEndError(err instanceof FleetApiError ? err.message : "Could not save End of Day.");
    } finally {
      setEndBusy(false);
    }
  }

  const loading = travel === undefined || items === null;
  const inert = offline || startBusy || endBusy;

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
                <>
                  {successMsg ? (
                    <Text
                      className="text-caption text-text-secondary"
                      accessibilityLiveRegion="polite"
                    >
                      {successMsg}
                    </Text>
                  ) : null}
                  {vehicleCaption ? (
                    <Text className="text-caption text-text-secondary">
                      {vehicleCaption} · Units: {unitLabel}
                    </Text>
                  ) : null}

                  {!openRow ? (
                    <View
                      className="bg-surface-raised rounded-lg p-2 gap-2 border border-divider"
                      accessibilityLabel="Day Start"
                    >
                      <Text className="font-semibold text-body text-text-primary">Day Start</Text>
                      {startError ? <Banner tone="danger">{startError}</Banner> : null}
                      <Field label="Date" error={startFieldErrors.usage_date}>
                        <TextInput
                          value={usageDate}
                          onChangeText={setUsageDate}
                          editable={!inert}
                          error={Boolean(startFieldErrors.usage_date)}
                          accessibilityLabel="Date"
                          placeholder="YYYY-MM-DD"
                          autoCapitalize="none"
                        />
                      </Field>
                      <Field label="Start place" error={startFieldErrors.start_place}>
                        <TextInput
                          value={startPlace}
                          onChangeText={setStartPlace}
                          editable={!inert}
                          error={Boolean(startFieldErrors.start_place)}
                          accessibilityLabel="Start place"
                        />
                      </Field>
                      <Field
                        label={`Start distance (${unitLabel})`}
                        error={startFieldErrors.start_distance}
                        hint={
                          minStartDistance != null
                            ? `Must be at least ${minStartDistance} ${unit}`
                            : undefined
                        }
                      >
                        <TextInput
                          value={startDistance}
                          onChangeText={setStartDistance}
                          keyboardType="decimal-pad"
                          editable={!inert}
                          error={Boolean(startFieldErrors.start_distance)}
                          accessibilityLabel={`Start distance (${unitLabel})`}
                        />
                      </Field>
                      <Field label="Start time" error={startFieldErrors.start_time}>
                        <TextInput
                          value={startTime}
                          onChangeText={setStartTime}
                          editable={!inert}
                          error={Boolean(startFieldErrors.start_time)}
                          accessibilityLabel="Start time"
                          placeholder="HH:mm"
                          autoCapitalize="none"
                        />
                      </Field>
                      <Field
                        label={`Refuel amount (${fuelUnit}, optional)`}
                        error={startFieldErrors.refuel_amount}
                      >
                        <TextInput
                          value={startRefuelAmount}
                          onChangeText={setStartRefuelAmount}
                          keyboardType="decimal-pad"
                          editable={!inert}
                          error={Boolean(startFieldErrors.refuel_amount)}
                          accessibilityLabel={`Refuel amount (${fuelUnit})`}
                        />
                      </Field>
                      <Field
                        label={`Refuel at mileage (${unitLabel}, optional)`}
                        error={startFieldErrors.refuel_at_mileage}
                      >
                        <TextInput
                          value={startRefuelAt}
                          onChangeText={setStartRefuelAt}
                          keyboardType="decimal-pad"
                          editable={!inert}
                          error={Boolean(startFieldErrors.refuel_at_mileage)}
                          accessibilityLabel={`Refuel at mileage (${unitLabel})`}
                        />
                      </Field>
                      <PrimaryButton
                        title={startBusy ? "Saving…" : "Save Day Start"}
                        onPress={() => void onStartSubmit()}
                        disabled={inert}
                        busy={startBusy}
                      />
                    </View>
                  ) : (
                    <View
                      className="bg-surface-raised rounded-lg p-2 gap-2 border border-divider"
                      accessibilityLabel="End of Day"
                    >
                      <Text className="font-semibold text-body text-text-primary">End of Day</Text>
                      <Text className="text-caption text-text-secondary">
                        Open since {openRow.start_time} · {openRow.start_place} ·{" "}
                        {openRow.start_distance} {openRow.distance_unit}
                      </Text>
                      {endError ? <Banner tone="danger">{endError}</Banner> : null}
                      <Field label="End place" error={endFieldErrors.end_place}>
                        <TextInput
                          value={endPlace}
                          onChangeText={setEndPlace}
                          editable={!inert}
                          error={Boolean(endFieldErrors.end_place)}
                          accessibilityLabel="End place"
                        />
                      </Field>
                      <Field
                        label={`End distance (${unitLabel})`}
                        error={endFieldErrors.end_distance}
                      >
                        <TextInput
                          value={endDistance}
                          onChangeText={setEndDistance}
                          keyboardType="decimal-pad"
                          editable={!inert}
                          error={Boolean(endFieldErrors.end_distance)}
                          accessibilityLabel={`End distance (${unitLabel})`}
                        />
                      </Field>
                      <Field label="End time" error={endFieldErrors.end_time}>
                        <TextInput
                          value={endTime}
                          onChangeText={setEndTime}
                          editable={!inert}
                          error={Boolean(endFieldErrors.end_time)}
                          accessibilityLabel="End time"
                          placeholder="HH:mm"
                          autoCapitalize="none"
                        />
                      </Field>
                      <Field
                        label={`Refuel amount (${fuelUnit}, optional)`}
                        error={endFieldErrors.refuel_amount}
                      >
                        <TextInput
                          value={endRefuelAmount}
                          onChangeText={setEndRefuelAmount}
                          keyboardType="decimal-pad"
                          editable={!inert}
                          error={Boolean(endFieldErrors.refuel_amount)}
                          accessibilityLabel={`Refuel amount (${fuelUnit})`}
                        />
                      </Field>
                      <Field
                        label={`Refuel at mileage (${unitLabel}, optional)`}
                        error={endFieldErrors.refuel_at_mileage}
                      >
                        <TextInput
                          value={endRefuelAt}
                          onChangeText={setEndRefuelAt}
                          keyboardType="decimal-pad"
                          editable={!inert}
                          error={Boolean(endFieldErrors.refuel_at_mileage)}
                          accessibilityLabel={`Refuel at mileage (${unitLabel})`}
                        />
                      </Field>
                      <PrimaryButton
                        title={endBusy ? "Saving…" : "Save End of Day"}
                        onPress={() => void onEndSubmit()}
                        disabled={inert}
                        busy={endBusy}
                      />
                    </View>
                  )}
                </>
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
                          {row.usage_date} · {row.status} · {row.vehicle?.label ?? "Vehicle"} ·{" "}
                          {row.vehicle?.license_plate ?? "—"}
                        </Text>
                        <Text className="text-caption text-text-secondary">
                          {row.start_place}
                          {row.end_place ? ` → ${row.end_place}` : " (open)"}
                        </Text>
                        <Text className="text-caption text-text-secondary">
                          {row.start_distance}
                          {row.end_distance != null ? `–${row.end_distance}` : ""}{" "}
                          {row.distance_unit} · {row.start_time}
                          {row.end_time ? `–${row.end_time}` : ""}
                        </Text>
                        {row.refuel_amount != null || row.refuel_at_mileage != null ? (
                          <Text className="text-caption text-text-secondary">
                            Refuel
                            {row.refuel_amount != null
                              ? ` ${row.refuel_amount}${row.refuel_amount_unit ?? ""}`
                              : ""}
                            {row.refuel_at_mileage != null
                              ? ` @ ${row.refuel_at_mileage} ${row.distance_unit}`
                              : ""}
                          </Text>
                        ) : null}
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
