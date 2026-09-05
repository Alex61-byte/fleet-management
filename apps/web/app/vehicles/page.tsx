"use client";

import { warningA11y, vehicleLabel, type Vehicle } from "@fleet/sdk";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell, ErrorRetry } from "../../components/app-shell";
import { ExpiryBadges, PrimaryLink, Skeleton } from "../../components/ui";
import { themeClasses } from "../../../../design/tailwind.theme";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

export default function VehiclesPage() {
  const { me, ready } = useAuth();
  const [items, setItems] = useState<Vehicle[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await api.listVehicles();
      setItems(res.items);
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
        <ErrorRetry message={error} onRetry={() => void load()} />
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
                aria-label={warningA11y(`${vehicleLabel(v)}, ${v.license_plate}`, v.warnings)}
              >
                <span className={themeClasses.label}>{vehicleLabel(v)}</span>
                <span className={themeClasses.caption}>{v.license_plate}</span>
                <ExpiryBadges warnings={v.warnings} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
