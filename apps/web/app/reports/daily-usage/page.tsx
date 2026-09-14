"use client";

import {
  FleetApiError,
  type CompanyDailyUsage,
  type Vehicle,
  vehicleLabel,
} from "@fleet/sdk";
import { useCallback, useEffect, useState } from "react";
import { AppShell, ErrorRetry } from "../../../components/app-shell";
import { Field, PrimaryButton, SecondaryButton, Skeleton, TextInput } from "../../../components/ui";
import { themeClasses } from "../../../../../design/tailwind.theme";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";

export default function DailyUsageReportPage() {
  const { me, ready, offline } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [vehiclesError, setVehiclesError] = useState("");
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [items, setItems] = useState<CompanyDailyUsage[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [csvBusy, setCsvBusy] = useState(false);

  const individual = me?.account_kind === "individual";

  const loadVehicles = useCallback(async () => {
    if (!me || me.role === "driver" || me.account_kind === "individual") return;
    setVehiclesLoading(true);
    setVehiclesError("");
    try {
      const res = await api.listVehicles();
      setVehicles(res.data?.items ?? []);
    } catch (err) {
      setVehiclesError(err instanceof FleetApiError ? err.message : "Could not load vehicles.");
      setVehicles([]);
    } finally {
      setVehiclesLoading(false);
    }
  }, [me]);

  const loadUsage = useCallback(async () => {
    if (!me || !selected || me.role === "driver" || me.account_kind === "individual") return;
    setLoading(true);
    setError("");
    try {
      const res = await api.listCompanyDailyUsage({
        vehicleId: selected.id,
        from: from || undefined,
        to: to || undefined,
      });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof FleetApiError ? err.message : "Could not load report.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [me, selected, from, to]);

  useEffect(() => {
    if (ready && me && me.role !== "driver" && me.account_kind === "company") void loadVehicles();
  }, [ready, me, loadVehicles]);

  useEffect(() => {
    if (selected) void loadUsage();
    else {
      setItems(null);
      setError("");
    }
  }, [selected, loadUsage]);

  function selectVehicle(v: Vehicle) {
    setFrom("");
    setTo("");
    setItems(null);
    setSelected(v);
  }

  function clearVehicle() {
    setSelected(null);
    setFrom("");
    setTo("");
    setItems(null);
    setError("");
  }

  async function onCsv() {
    if (offline || !me || !selected) return;
    setCsvBusy(true);
    setError("");
    try {
      const csv = await api.downloadCompanyDailyUsageCsv({
        vehicleId: selected.id,
        from: from || undefined,
        to: to || undefined,
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "daily-usage.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof FleetApiError ? err.message : "CSV export failed.");
    } finally {
      setCsvBusy(false);
    }
  }

  if (individual) {
    return (
      <AppShell title="Daily usage report">
        <p className={themeClasses.body}>
          Daily usage reports are available on company workspaces with drivers.
        </p>
      </AppShell>
    );
  }

  if (!selected) {
    return (
      <AppShell title="Daily usage report">
        <p className={`${themeClasses.body} mb-2`}>Select a vehicle to view its usage history.</p>
        {vehiclesLoading ? (
          <div className="flex flex-col gap-1">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : vehiclesError ? (
          <ErrorRetry message={vehiclesError} onRetry={() => void loadVehicles()} />
        ) : vehicles && vehicles.length === 0 ? (
          <p className={themeClasses.body}>No vehicles yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {vehicles?.map((v) => {
              const name = vehicleLabel(v);
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    className={`${themeClasses.raised} w-full text-left p-2 flex flex-col gap-0.5`}
                    onClick={() => selectVehicle(v)}
                    aria-label={`Usage for ${name}${v.license_plate ? `, ${v.license_plate}` : ""}`}
                  >
                    <span className={themeClasses.label}>{name}</span>
                    {v.license_plate ? (
                      <span className={themeClasses.caption}>{v.license_plate}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </AppShell>
    );
  }

  const selectedName = vehicleLabel(selected);

  return (
    <AppShell
      title="Daily usage report"
      action={
        <SecondaryButton
          type="button"
          disabled={csvBusy || offline || loading}
          onClick={() => void onCsv()}
        >
          {csvBusy ? "Exporting…" : "Export CSV"}
        </SecondaryButton>
      }
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <SecondaryButton type="button" onClick={clearVehicle}>
          All vehicles
        </SecondaryButton>
        <span className={themeClasses.label}>
          {selectedName}
          {selected.license_plate ? ` · ${selected.license_plate}` : ""}
        </span>
      </div>

      <form
        className="flex flex-wrap items-end gap-2 mb-2"
        onSubmit={(e) => {
          e.preventDefault();
          void loadUsage();
        }}
      >
        <Field label="From">
          <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To">
          <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <PrimaryButton type="submit" disabled={loading}>
          Apply
        </PrimaryButton>
      </form>

      {loading ? (
        <div className="flex flex-col gap-1">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : error ? (
        <ErrorRetry message={error} onRetry={() => void loadUsage()} />
      ) : items && items.length === 0 ? (
        <p className={themeClasses.body}>No daily usage rows in this range.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items?.map((row) => (
            <li key={row.id} className={`${themeClasses.raised} p-2 flex flex-col gap-0.5`}>
              <span className={themeClasses.label}>
                {row.usage_date} · {row.status} · {row.driver_email ?? "Driver"}
              </span>
              <span className={themeClasses.caption}>
                {row.start_place}
                {row.end_place ? ` → ${row.end_place}` : " (open)"} · {row.start_distance}
                {row.end_distance != null ? `–${row.end_distance}` : ""} {row.distance_unit} ·{" "}
                {row.start_time}
                {row.end_time ? `–${row.end_time}` : ""}
              </span>
              {row.refuel_amount != null || row.refuel_at_mileage != null ? (
                <span className={themeClasses.caption}>
                  Refuel
                  {row.refuel_amount != null
                    ? ` ${row.refuel_amount}${row.refuel_amount_unit ?? ""}`
                    : ""}
                  {row.refuel_at_mileage != null
                    ? ` @ ${row.refuel_at_mileage} ${row.distance_unit}`
                    : ""}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
