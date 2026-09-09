"use client";

import {
  FleetApiError,
  formatVehicleMileage,
  odometerUnitLabel,
  type DriverTravel,
  type DriverVehicle,
} from "@fleet/sdk";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { DriverBackLink, DriverShell } from "../../../components/driver-shell";
import {
  Field,
  PrimaryButton,
  SecondaryButton,
  Skeleton,
  SelectInput,
  TextInput,
} from "../../../components/ui";
import { themeClasses } from "../../../../../design/tailwind.theme";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";

export default function DriverTravelPage() {
  const { me, ready, offline } = useAuth();
  const router = useRouter();

  const [vehicles, setVehicles] = useState<DriverVehicle[] | null>(null);
  const [travel, setTravel] = useState<DriverTravel | null | undefined>(undefined);
  const [vehicleId, setVehicleId] = useState("");
  const [odometer, setOdometer] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      const [vRes, t] = await Promise.all([api.listDriverVehicles(), api.getDriverTravel()]);
      const vItems = vRes.data?.items ?? [];
      setVehicles(vItems);
      setTravel(t.travel);
      if (t.travel) {
        setVehicleId(t.travel.vehicle_id);
        setOdometer(String(t.travel.odometer));
      } else if (vItems.length === 1) {
        setVehicleId(vItems[0]!.id);
      }
    } catch (err) {
      setVehicles([]);
      setTravel(null);
      setLoadError(err instanceof FleetApiError ? err.message : "Could not load travel data.");
    }
  }, []);

  useEffect(() => {
    if (!ready || !me || me.role !== "driver") return;
    void load();
  }, [ready, me, load]);

  const selected = useMemo(
    () => vehicles?.find((v) => v.id === vehicleId) ?? null,
    [vehicles, vehicleId],
  );
  const unit = selected?.odometer_unit ?? travel?.odometer_unit ?? "km";
  const unitLabel = odometerUnitLabel(unit);
  const emptyFleet = vehicles !== null && vehicles.length === 0;
  const loading = vehicles === null || travel === undefined;

  async function onSave(e: FormEvent) {
    e.preventDefault();
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

  if (!ready || !me || me.role !== "driver") {
    return (
      <main className={`${themeClasses.page} min-h-screen p-3`}>
        <div className="h-6 w-40 bg-disabled-surface rounded-md" />
      </main>
    );
  }

  return (
    <DriverShell title="Next travel">
      <DriverBackLink />
      <section className={themeClasses.panel} aria-label="Next travel">
        <h2 className={themeClasses.sectionTitle}>Next travel</h2>
        {loadError ? (
          <div className="flex flex-col gap-2">
            <p className={themeClasses.errorText} role="alert">
              {loadError}
            </p>
            <SecondaryButton type="button" onClick={() => void load()}>
              Retry
            </SecondaryButton>
          </div>
        ) : loading ? (
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <>
            {travel ? (
              <div className="mb-2 flex flex-col gap-0.5">
                <p className={themeClasses.label}>{travel.vehicle?.label ?? "Vehicle"}</p>
                <p className={themeClasses.caption}>
                  {travel.vehicle?.license_plate ?? "—"} · Odometer {travel.odometer}{" "}
                  {travel.odometer_unit}
                </p>
              </div>
            ) : (
              <p className={`${themeClasses.body} mb-2`}>No vehicle selected for your next travel.</p>
            )}

            {emptyFleet ? (
              <p className={themeClasses.body}>No vehicles available. Ask your company to add a vehicle.</p>
            ) : (
              <form className="flex flex-col gap-2" onSubmit={(e) => void onSave(e)}>
                <Field label="Vehicle for next travel">
                  <SelectInput
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    disabled={offline || busy}
                    aria-label="Vehicle for next travel"
                  >
                    <option value="">Select a vehicle</option>
                    {vehicles!.map((v) => {
                      const miles =
                        v.mileage != null
                          ? ` · ${formatVehicleMileage(v.mileage, v.mileage_unit ?? v.odometer_unit)}`
                          : "";
                      return (
                        <option key={v.id} value={v.id}>
                          {v.label} · {v.license_plate}
                          {miles}
                        </option>
                      );
                    })}
                  </SelectInput>
                </Field>
                <Field label={`Odometer (${unitLabel.toLowerCase()})`} hint={unitLabel}>
                  <TextInput
                    inputMode="decimal"
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    disabled={offline || busy}
                    aria-label={`Odometer in ${unitLabel.toLowerCase()}`}
                    placeholder="0"
                  />
                </Field>
                {formError ? (
                  <p className={themeClasses.errorText} role="alert">
                    {formError}
                  </p>
                ) : null}
                <PrimaryButton type="submit" busy={busy} disabled={offline || busy || !vehicleId}>
                  {travel ? "Update selection" : "Save selection"}
                </PrimaryButton>
              </form>
            )}
          </>
        )}
      </section>
    </DriverShell>
  );
}
