"use client";

import { FleetApiError, odometerUnitLabel, type ServiceDueItem } from "@fleet/sdk";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppShell, ErrorRetry } from "../../components/app-shell";
import { Skeleton } from "../../components/ui";
import { themeClasses } from "../../../../design/tailwind.theme";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

function statusLabel(row: ServiceDueItem): { text: string; badge: string } {
  if (row.service_status === "approaching" && !row.due_by_days && !row.due_by_distance) {
    return { text: "Approaching", badge: themeClasses.badgeWarning };
  }
  if (row.days_overdue != null && row.days_overdue > 0) {
    return { text: "Overdue", badge: themeClasses.badgeExpired };
  }
  return { text: "Due", badge: themeClasses.badgeExpired };
}

function reasonLine(row: ServiceDueItem): string {
  const unit = odometerUnitLabel(row.next_service_distance_unit);
  const parts: string[] = [];
  if (row.service_status === "approaching" && !row.due_by_days && !row.due_by_distance) {
    if (row.distance_remaining != null) {
      parts.push(`${row.distance_remaining} ${unit} remaining`);
    } else {
      parts.push("Approaching by distance");
    }
    return parts.join(" · ");
  }
  if (row.due_by_days) {
    parts.push(
      row.days_overdue != null && row.days_overdue > 0
        ? `${row.days_overdue}d overdue`
        : "Due by days",
    );
  }
  if (row.due_by_distance) {
    parts.push(
      row.distance_remaining != null && row.distance_remaining <= 0
        ? "Due by distance"
        : "Due by distance",
    );
  }
  return parts.join(" · ") || "Due";
}

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
        <p className={themeClasses.body}>
          No vehicles need service. None are due, overdue, or within 2,000 remaining of next
          service.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items?.map((row) => {
            const label = row.vehicle?.label ?? "Vehicle";
            const plate = row.vehicle?.license_plate ?? "";
            const status = statusLabel(row);
            const unit = odometerUnitLabel(row.next_service_distance_unit);
            return (
              <li key={row.vehicle_id}>
                <Link
                  href={`/vehicles/${row.vehicle_id}`}
                  className={`${themeClasses.raised} p-2 min-h-hit flex flex-col gap-0.5`}
                  aria-label={`${label}, ${plate}, ${status.text}, ${reasonLine(row)}`}
                >
                  <span className="flex flex-row flex-wrap items-center gap-1">
                    <span className={themeClasses.label}>
                      {label}
                      {plate ? ` · ${plate}` : ""}
                    </span>
                    <span className={status.badge}>{status.text}</span>
                  </span>
                  <span className={themeClasses.caption}>{reasonLine(row)}</span>
                  <span className={themeClasses.caption}>
                    Interval {row.next_service_days}d / {row.next_service_distance} {unit}
                    {row.vehicle_mileage != null ? ` · odo ${row.vehicle_mileage}` : ""}
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
