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

type FieldErrors = {
  usage_date?: string;
  start_place?: string;
  start_distance?: string;
  start_time?: string;
  end_place?: string;
  end_distance?: string;
  end_time?: string;
};

export default function DriverDailyUsagePage() {
  const { me, ready, offline } = useAuth();
  const router = useRouter();
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
    if (!ready || !me || me.role !== "driver") return;
    void load();
  }, [ready, me, load]);

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
    setFormError(null);
  }

  function validate(): boolean {
    const next: FieldErrors = {};
    if (!usageDate.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(usageDate.trim())) {
      next.usage_date = "Enter a valid date";
    }
    if (!startPlace.trim()) next.start_place = "Enter a start place";
    if (!endPlace.trim()) next.end_place = "Enter an end place";
    if (!startTime.trim()) next.start_time = "Enter a start time";
    else if (!isHHmm(startTime)) next.start_time = "Enter a start time";
    if (!endTime.trim()) next.end_time = "Enter an end time";
    else if (!isHHmm(endTime)) next.end_time = "Enter an end time";
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);
    if (!validate()) return;
    setBusy(true);
    try {
      await api.createDriverDailyUsage({
        usage_date: usageDate.trim(),
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

  if (!ready || !me || me.role !== "driver") {
    return (
      <main className={`${themeClasses.page} min-h-screen p-3`}>
        <div className="h-6 w-40 bg-disabled-surface rounded-md" />
      </main>
    );
  }

  const loading = travel === undefined || items === null;
  const inert = offline || busy;

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
            <section className={themeClasses.panel} aria-label="Log daily usage">
              <h2 className={themeClasses.sectionTitle}>Log daily usage</h2>
              {vehicleCaption ? (
                <p className={themeClasses.caption}>{vehicleCaption}</p>
              ) : null}
              <p className={themeClasses.caption}>Units: {unitLabel}</p>
              {successMsg ? (
                <p className={themeClasses.caption} aria-live="polite">
                  {successMsg}
                </p>
              ) : null}
              {formError ? <Banner tone="danger">{formError}</Banner> : null}

              <form className="mt-2 flex flex-col gap-2" onSubmit={(e) => void onSubmit(e)}>
                <Field label="Date" error={fieldErrors.usage_date}>
                  <TextInput
                    type="date"
                    value={usageDate}
                    onChange={(e) => setUsageDate(e.target.value)}
                    disabled={inert}
                    error={Boolean(fieldErrors.usage_date)}
                    aria-label="Date"
                  />
                </Field>
                <Field label="Start place" error={fieldErrors.start_place}>
                  <TextInput
                    value={startPlace}
                    onChange={(e) => setStartPlace(e.target.value)}
                    disabled={inert}
                    error={Boolean(fieldErrors.start_place)}
                    aria-label="Start place"
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
                    inputMode="decimal"
                    value={startDistance}
                    onChange={(e) => setStartDistance(e.target.value)}
                    disabled={inert}
                    error={Boolean(fieldErrors.start_distance)}
                    aria-label={`Start distance (${unitLabel})`}
                  />
                </Field>
                <Field label="Start time" error={fieldErrors.start_time}>
                  <TextInput
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    disabled={inert}
                    error={Boolean(fieldErrors.start_time)}
                    aria-label="Start time"
                  />
                </Field>
                <Field label="End place" error={fieldErrors.end_place}>
                  <TextInput
                    value={endPlace}
                    onChange={(e) => setEndPlace(e.target.value)}
                    disabled={inert}
                    error={Boolean(fieldErrors.end_place)}
                    aria-label="End place"
                  />
                </Field>
                <Field
                  label={`End distance (${unitLabel})`}
                  error={fieldErrors.end_distance}
                >
                  <TextInput
                    inputMode="decimal"
                    value={endDistance}
                    onChange={(e) => setEndDistance(e.target.value)}
                    disabled={inert}
                    error={Boolean(fieldErrors.end_distance)}
                    aria-label={`End distance (${unitLabel})`}
                  />
                </Field>
                <Field label="End time" error={fieldErrors.end_time}>
                  <TextInput
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    disabled={inert}
                    error={Boolean(fieldErrors.end_time)}
                    aria-label="End time"
                  />
                </Field>
                <PrimaryButton type="submit" busy={busy} disabled={inert}>
                  Submit daily usage
                </PrimaryButton>
              </form>
            </section>
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
                        {row.usage_date} · {row.vehicle?.label ?? "Vehicle"} ·{" "}
                        {row.vehicle?.license_plate ?? "—"}
                      </p>
                      <p className={themeClasses.caption}>
                        {row.start_place} → {row.end_place}
                      </p>
                      <p className={themeClasses.caption}>
                        {row.start_distance}–{row.end_distance} {row.distance_unit} ·{" "}
                        {row.start_time}–{row.end_time}
                      </p>
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
