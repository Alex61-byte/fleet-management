"use client";

import {
  formatVehicleMileage,
  odometerUnitLabel,
  warningA11y,
  vehicleLabel,
  type Vehicle,
} from "@fleet/sdk";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell, ErrorRetry } from "../../components/app-shell";
import { ExpiryBadges, PrimaryLink, Skeleton } from "../../components/ui";
import { themeClasses } from "../../../../design/tailwind.theme";
import { useAuth } from "../../lib/auth-context";
import { queryVehicles } from "../../lib/fleet-queries";

export default function VehiclesPage() {
  const { me, ready } = useAuth();
  const [items, setItems] = useState<Vehicle[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(force = false) {
    if (!me) return;
    setLoading(true);
    setError("");
    try {
      const res = await queryVehicles(me.company_id, { force });
      setItems(res.data.items);
    } catch {
      setError("Could not load vehicles.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ready && me && me.role !== "driver") void load();
  }, [ready, me]);

  return (
    <AppShell
      title="Vehicles"
      action={<PrimaryLink href="/vehicles/new">Add vehicle</PrimaryLink>}
    >
      {loading ? (
        <div className="flex flex-col gap-1">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : error ? (
        <ErrorRetry message={error} onRetry={() => void load(true)} />
      ) : items && items.length === 0 ? (
        <div className="flex flex-col gap-2">
          <p className={themeClasses.body}>No vehicles yet.</p>
          <PrimaryLink href="/vehicles/new">Add vehicle</PrimaryLink>
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {items?.map((v) => (
            <li key={v.id}>
              <Link
                href={`/vehicles/${v.id}`}
                className={`${themeClasses.raised} p-2 min-h-hit flex flex-col gap-0.5`}
                aria-label={warningA11y(
                  `${vehicleLabel(v)}, ${v.license_plate}${v.has_side_images ? ", has photos" : ""}`,
                  v.warnings,
                  v.custom_expirations,
                )}
              >
                <span className={`${themeClasses.label} inline-flex flex-wrap items-center gap-1`}>
                  {vehicleLabel(v)}
                  {v.has_side_images === true ? (
                    <span className={themeClasses.vehicleSidePresence}>Photos</span>
                  ) : null}
                </span>
                <span className={themeClasses.caption}>{v.license_plate}</span>
                {v.mileage != null ? (
                  <span className={themeClasses.caption}>
                    {formatVehicleMileage(v.mileage, v.mileage_unit)} ·{" "}
                    {odometerUnitLabel(v.mileage_unit ?? "km")}
                  </span>
                ) : null}
                <ExpiryBadges warnings={v.warnings} customExpirations={v.custom_expirations} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
