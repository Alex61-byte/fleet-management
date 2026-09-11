"use client";

import { FleetApiError, type CompanyDailyUsage } from "@fleet/sdk";
import { useCallback, useEffect, useState } from "react";
import { AppShell, ErrorRetry } from "../../../components/app-shell";
import { Field, PrimaryButton, SecondaryButton, Skeleton, TextInput } from "../../../components/ui";
import { themeClasses } from "../../../../../design/tailwind.theme";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";

export default function DailyUsageReportPage() {
  const { me, ready, offline } = useAuth();
  const [items, setItems] = useState<CompanyDailyUsage[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [csvBusy, setCsvBusy] = useState(false);

  const individual = me?.account_kind === "individual";

  const load = useCallback(async () => {
    if (!me || me.role === "driver" || me.account_kind === "individual") return;
    setLoading(true);
    setError("");
    try {
      const res = await api.listCompanyDailyUsage({
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
  }, [me, from, to]);

  useEffect(() => {
    if (ready && me && me.role !== "driver" && me.account_kind === "company") void load();
  }, [ready, me, load]);

  async function onCsv() {
    if (offline || !me) return;
    setCsvBusy(true);
    setError("");
    try {
      const csv = await api.downloadCompanyDailyUsageCsv({
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

  return (
    <AppShell
      title="Daily usage report"
      action={
        <SecondaryButton type="button" disabled={csvBusy || offline || loading} onClick={() => void onCsv()}>
          {csvBusy ? "Exporting…" : "Export CSV"}
        </SecondaryButton>
      }
    >
      <form
        className="flex flex-wrap items-end gap-2 mb-2"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
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
        <ErrorRetry message={error} onRetry={() => void load()} />
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
                {row.vehicle?.label ?? "Vehicle"}
                {row.vehicle?.license_plate ? ` · ${row.vehicle.license_plate}` : ""}
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
