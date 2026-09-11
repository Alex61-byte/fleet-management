"use client";

import { FleetApiError, type ServiceDueItem } from "@fleet/sdk";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppShell, ErrorRetry } from "../../components/app-shell";
import { Skeleton } from "../../components/ui";
import { themeClasses } from "../../../../design/tailwind.theme";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

export default function ServiceDuePage() {
  const { me, ready } = useAuth();
  const [items, setItems] = useState<ServiceDueItem[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.listServiceDue();
      setItems(res.items);
    } catch (err) {
      setError(err instanceof FleetApiError ? err.message : "Could not load service due.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready && me && me.role !== "driver") void load();
  }, [ready, me, load]);

  return (
    <AppShell title="Service due">
      {loading ? (
        <div className="flex flex-col gap-1">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : error ? (
        <ErrorRetry message={error} onRetry={() => void load()} />
      ) : items && items.length === 0 ? (
        <p className={themeClasses.body}>No vehicles are due for service based on handover data.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items?.map((row) => {
            const label = row.vehicle?.label ?? "Vehicle";
            const plate = row.vehicle?.license_plate ?? "";
            return (
              <li key={row.vehicle_id}>
                <Link
                  href={`/vehicles/${row.vehicle_id}`}
                  className={`${themeClasses.raised} p-2 min-h-hit flex flex-col gap-0.5`}
                >
                  <span className={themeClasses.label}>
                    {label}
                    {plate ? ` · ${plate}` : ""}
                  </span>
                  <span className={themeClasses.caption}>
                    {row.due_by_days
                      ? row.days_overdue != null && row.days_overdue > 0
                        ? `${row.days_overdue}d overdue`
                        : "Due by days"
                      : null}
                    {row.due_by_days && row.due_by_distance ? " · " : ""}
                    {row.due_by_distance ? "Due by distance" : ""}
                  </span>
                  <span className={themeClasses.caption}>
                    Interval {row.next_service_days}d / {row.next_service_distance}{" "}
                    {row.next_service_distance_unit}
                    {row.vehicle_mileage != null
                      ? ` · odo ${row.vehicle_mileage}`
                      : ""}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
