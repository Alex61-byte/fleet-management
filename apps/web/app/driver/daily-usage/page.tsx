"use client";

import {
  FleetApiError,
  odometerUnitLabel,
  type DailyUsage,
  type DriverTravel,
  type OdometerUnit,
} from "@fleet/sdk";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { DriverBackLink, DriverShell } from "../../../components/driver-shell";
import {
  Banner,
  Field,
  PrimaryButton,
  SecondaryButton,
  Skeleton,
  TextInput,
} from "../../../components/ui";
import { themeClasses } from "../../../../../design/tailwind.theme";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";

function localToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

export default function DriverDailyUsagePage() {
  const { me, ready, offline } = useAuth();
  const router = useRouter();
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

  useEffect(() => {
    if (!ready) return;
    if (!me) {
      router.replace("/sign-in");
      return;
    }
    if (me.role !== "driver") {
      router.replace("/home");
      return;
    }
  }, [ready, me, router]);

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
    if (!ready || !me || me.role !== "driver") return;
    void load();
  }, [ready, me, load]);

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

  /** A61 floor: max(vehicle.mileage, latest closed end_distance on active vehicle). */
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
    setStartError(null);
  }

  function resetEndFields() {
    setEndPlace("");
    setEndDistance("");
    setEndTime("");
    setEndRefuelAmount("");
    setEndRefuelAt("");
    setEndFieldErrors({});
    setEndError(null);
  }

  function validateOptionalRefuel(
    amount: string,
    at: string,
  ): { amount?: string; at?: string } {
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
    if (!usageDate.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(usageDate.trim())) {
      next.usage_date = "Enter a valid date";
    }
    if (!startPlace.trim()) next.start_place = "Enter a start place";
    if (!startTime.trim()) next.start_time = "Enter a start time";
    else if (!isHHmm(startTime)) next.start_time = "Enter a start time";
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
    else if (!isHHmm(endTime)) next.end_time = "Enter an end time";
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

  async function onStartSubmit(e: FormEvent) {
    e.preventDefault();
    setStartError(null);
    setSuccessMsg(null);
    if (!validateStart()) return;
    setStartBusy(true);
    try {
      const body: Parameters<typeof api.createDriverDailyUsage>[0] = {
        usage_date: usageDate.trim(),
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

  async function onEndSubmit(e: FormEvent) {
    e.preventDefault();
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

  if (!ready || !me || me.role !== "driver") {
    return (
      <main className={`${themeClasses.page} min-h-screen p-3`}>
        <div className="h-6 w-40 bg-disabled-surface rounded-md" />
      </main>
    );
  }

  const loading = travel === undefined || items === null;
  const inert = offline || startBusy || endBusy;

  return (
    <DriverShell title="Daily usage">
      <DriverBackLink />
      {offline ? <Banner tone="warning">You are offline.</Banner> : null}

      {loadError ? (
        <section className={themeClasses.panel}>
          <p className={themeClasses.errorText} role="alert">
            {loadError}
          </p>
          <SecondaryButton type="button" className="mt-2 w-full" onClick={() => void load()}>
            Retry
          </SecondaryButton>
        </section>
      ) : loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <>
          {!travel ? (
            <section className={themeClasses.panel} aria-label="Daily usage">
              <h2 className={themeClasses.sectionTitle}>Daily usage</h2>
              <p className={themeClasses.body}>
                Select next travel first before logging daily usage.
              </p>
              <Link
                href="/driver/travel"
                className={`${themeClasses.buttonPrimary} mt-2 inline-flex items-center justify-center no-underline w-full`}
              >
                Go to Next travel
              </Link>
            </section>
          ) : (
            <>
              {successMsg ? (
                <p className={themeClasses.caption} aria-live="polite">
                  {successMsg}
                </p>
              ) : null}
              {vehicleCaption ? (
                <p className={themeClasses.caption}>{vehicleCaption} · Units: {unitLabel}</p>
              ) : null}

              {!openRow ? (
                <section className={themeClasses.panel} aria-label="Day Start">
                  <h2 className={themeClasses.sectionTitle}>Day Start</h2>
                  {startError ? <Banner tone="danger">{startError}</Banner> : null}
                  <form
                    className="mt-2 flex flex-col gap-2"
                    onSubmit={(e) => void onStartSubmit(e)}
                  >
                    <Field label="Date" error={startFieldErrors.usage_date}>
                      <TextInput
                        type="date"
                        value={usageDate}
                        onChange={(e) => setUsageDate(e.target.value)}
                        disabled={inert}
                        error={Boolean(startFieldErrors.usage_date)}
                        aria-label="Date"
                      />
                    </Field>
                    <Field label="Start place" error={startFieldErrors.start_place}>
                      <TextInput
                        value={startPlace}
                        onChange={(e) => setStartPlace(e.target.value)}
                        disabled={inert}
                        error={Boolean(startFieldErrors.start_place)}
                        aria-label="Start place"
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
                        inputMode="decimal"
                        value={startDistance}
                        onChange={(e) => setStartDistance(e.target.value)}
                        disabled={inert}
                        error={Boolean(startFieldErrors.start_distance)}
                        aria-label={`Start distance (${unitLabel})`}
                      />
                    </Field>
                    <Field label="Start time" error={startFieldErrors.start_time}>
                      <TextInput
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        disabled={inert}
                        error={Boolean(startFieldErrors.start_time)}
                        aria-label="Start time"
                      />
                    </Field>
                    <Field
                      label={`Refuel amount (${fuelUnit}, optional)`}
                      error={startFieldErrors.refuel_amount}
                    >
                      <TextInput
                        inputMode="decimal"
                        value={startRefuelAmount}
                        onChange={(e) => setStartRefuelAmount(e.target.value)}
                        disabled={inert}
                        error={Boolean(startFieldErrors.refuel_amount)}
                        aria-label={`Refuel amount (${fuelUnit})`}
                      />
                    </Field>
                    <Field
                      label={`Refuel at mileage (${unitLabel}, optional)`}
                      error={startFieldErrors.refuel_at_mileage}
                    >
                      <TextInput
                        inputMode="decimal"
                        value={startRefuelAt}
                        onChange={(e) => setStartRefuelAt(e.target.value)}
                        disabled={inert}
                        error={Boolean(startFieldErrors.refuel_at_mileage)}
                        aria-label={`Refuel at mileage (${unitLabel})`}
                      />
                    </Field>
                    <PrimaryButton type="submit" busy={startBusy} disabled={inert}>
                      Save Day Start
                    </PrimaryButton>
                  </form>
                </section>
              ) : (
                <section className={themeClasses.panel} aria-label="End of Day">
                  <h2 className={themeClasses.sectionTitle}>End of Day</h2>
                  <p className={themeClasses.caption}>
                    Open since {openRow.start_time} · {openRow.start_place} ·{" "}
                    {openRow.start_distance} {openRow.distance_unit}
                  </p>
                  {endError ? <Banner tone="danger">{endError}</Banner> : null}
                  <form
                    className="mt-2 flex flex-col gap-2"
                    onSubmit={(e) => void onEndSubmit(e)}
                  >
                    <Field label="End place" error={endFieldErrors.end_place}>
                      <TextInput
                        value={endPlace}
                        onChange={(e) => setEndPlace(e.target.value)}
                        disabled={inert}
                        error={Boolean(endFieldErrors.end_place)}
                        aria-label="End place"
                      />
                    </Field>
                    <Field
                      label={`End distance (${unitLabel})`}
                      error={endFieldErrors.end_distance}
                    >
                      <TextInput
                        inputMode="decimal"
                        value={endDistance}
                        onChange={(e) => setEndDistance(e.target.value)}
                        disabled={inert}
                        error={Boolean(endFieldErrors.end_distance)}
                        aria-label={`End distance (${unitLabel})`}
                      />
                    </Field>
                    <Field label="End time" error={endFieldErrors.end_time}>
                      <TextInput
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        disabled={inert}
                        error={Boolean(endFieldErrors.end_time)}
                        aria-label="End time"
                      />
                    </Field>
                    <Field
                      label={`Refuel amount (${fuelUnit}, optional)`}
                      error={endFieldErrors.refuel_amount}
                    >
                      <TextInput
                        inputMode="decimal"
                        value={endRefuelAmount}
                        onChange={(e) => setEndRefuelAmount(e.target.value)}
                        disabled={inert}
                        error={Boolean(endFieldErrors.refuel_amount)}
                        aria-label={`Refuel amount (${fuelUnit})`}
                      />
                    </Field>
                    <Field
                      label={`Refuel at mileage (${unitLabel}, optional)`}
                      error={endFieldErrors.refuel_at_mileage}
                    >
                      <TextInput
                        inputMode="decimal"
                        value={endRefuelAt}
                        onChange={(e) => setEndRefuelAt(e.target.value)}
                        disabled={inert}
                        error={Boolean(endFieldErrors.refuel_at_mileage)}
                        aria-label={`Refuel at mileage (${unitLabel})`}
                      />
                    </Field>
                    <PrimaryButton type="submit" busy={endBusy} disabled={inert}>
                      Save End of Day
                    </PrimaryButton>
                  </form>
                </section>
              )}
            </>
          )}

          <section className={themeClasses.panel} aria-label="Your daily usage">
            <h2 className={themeClasses.sectionTitle}>Your entries</h2>
            {items.length === 0 ? (
              <p className={themeClasses.caption}>No daily usage entries yet.</p>
            ) : (
              <>
                <p className={`${themeClasses.caption} font-tabular`}>
                  {items.length} {items.length === 1 ? "entry" : "entries"}
                </p>
                <ul className="mt-1 flex flex-col gap-1">
                  {items.map((row) => (
                    <li
                      key={row.id}
                      className={`${themeClasses.listRow} flex flex-col gap-0.5`}
                    >
                      <p className={themeClasses.label}>
                        {row.usage_date} · {row.status} · {row.vehicle?.label ?? "Vehicle"} ·{" "}
                        {row.vehicle?.license_plate ?? "—"}
                      </p>
                      <p className={themeClasses.caption}>
                        {row.start_place}
                        {row.end_place ? ` → ${row.end_place}` : " (open)"}
                      </p>
                      <p className={themeClasses.caption}>
                        {row.start_distance}
                        {row.end_distance != null ? `–${row.end_distance}` : ""}{" "}
                        {row.distance_unit} · {row.start_time}
                        {row.end_time ? `–${row.end_time}` : ""}
                      </p>
                      {row.refuel_amount != null || row.refuel_at_mileage != null ? (
                        <p className={themeClasses.caption}>
                          Refuel
                          {row.refuel_amount != null
                            ? ` ${row.refuel_amount}${row.refuel_amount_unit ?? ""}`
                            : ""}
                          {row.refuel_at_mileage != null
                            ? ` @ ${row.refuel_at_mileage} ${row.distance_unit}`
                            : ""}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </>
      )}
    </DriverShell>
  );
}
