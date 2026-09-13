"use client";

import {
  FleetApiError,
  formatVehicleMileage,
  type DriverTravel,
  type DriverVehicle,
} from "@fleet/sdk";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { DriverBackLink, DriverShell } from "../../../components/driver-shell";
import {
  Field,
  PrimaryButton,
  SecondaryButton,
  Skeleton,
  SelectInput,
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
      const [vRes, t, h] = await Promise.all([
        api.listDriverVehicles(),
        api.getDriverTravel(),
        api.getDriverActiveHandover().catch(() => ({ handover: null })),
      ]);
      // Open Out locks next travel — finish Handover In first.
      if (h.handover) {
        router.replace("/driver/handover");
        return;
      }
      const vItems = vRes.data?.items ?? [];
      setVehicles(vItems);
      setTravel(t.travel);
      // Prefill only when the active selection is still available (not open Out).
      const activeStillAvailable =
        t.travel != null && vItems.some((v) => v.id === t.travel!.vehicle_id);
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
  }, [router]);

  useEffect(() => {
    if (!ready || !me || me.role !== "driver") return;
    void load();
  }, [ready, me, load]);

  const emptyFleet = vehicles !== null && vehicles.length === 0;
  const loading = vehicles === null || travel === undefined;
  const selectedAvailable =
    travel != null && vehicles != null && vehicles.some((v) => v.id === travel.vehicle_id);

  async function onSave(e: FormEvent) {
    e.preventDefault();
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
      router.replace("/driver/handover");
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
          </div>
        ) : (
          <>
            {selectedAvailable && travel ? (
              <div className="mb-2 flex flex-col gap-0.5">
                <p className={themeClasses.label}>{travel.vehicle?.label ?? "Vehicle"}</p>
                <p className={themeClasses.caption}>{travel.vehicle?.license_plate ?? "—"}</p>
              </div>
            ) : (
              <p className={`${themeClasses.body} mb-2`}>
                Select an available vehicle, then complete handover with odometer and service data.
              </p>
            )}

            {emptyFleet ? (
              <p className={themeClasses.body}>
                No vehicles available. Ask your company to add a vehicle, or wait until Handover In
                is completed.
              </p>
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
                {formError ? (
                  <p className={themeClasses.errorText} role="alert">
                    {formError}
                  </p>
                ) : null}
                <PrimaryButton type="submit" busy={busy} disabled={offline || busy || !vehicleId}>
                  Continue to handover
                </PrimaryButton>
              </form>
            )}
          </>
        )}
      </section>
    </DriverShell>
  );
}
