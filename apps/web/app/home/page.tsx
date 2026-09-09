"use client";

import { warningA11y, vehicleLabel, type Home } from "@fleet/sdk";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell, ErrorRetry } from "../../components/app-shell";
import { ExpiryBadges, PrimaryLink, Skeleton } from "../../components/ui";
import { themeClasses } from "../../../../design/tailwind.theme";
import { useAuth } from "../../lib/auth-context";
import { queryHome } from "../../lib/fleet-queries";

export default function HomePage() {
  const { me, ready } = useAuth();
  const [home, setHome] = useState<Home | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(force = false) {
    if (!me) return;
    setError("");
    setLoading(true);
    try {
      const res = await queryHome(me.company_id, { force });
      setHome(res.data);
    } catch {
      setError("Could not load home.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ready && me && me.role !== "driver") void load();
  }, [ready, me]);

  const individual = me?.account_kind === "individual";

  return (
    <AppShell
      title="Home"
      action={<PrimaryLink href="/vehicles/new">Add vehicle</PrimaryLink>}
    >
      {individual ? (
        <p className={`${themeClasses.caption} text-text-secondary -mt-1`}>Owner · personal vehicles</p>
      ) : null}
      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : error ? (
        <ErrorRetry message={error} onRetry={() => void load(true)} />
      ) : home ? (
        <>
          {individual ? (
            <Link
              href="/vehicles"
              className={`${themeClasses.raised} p-2 min-h-hit`}
              aria-label={`Vehicles, ${home.vehicle_count}`}
            >
              <p className={themeClasses.caption}>Vehicles</p>
              <p className="font-sans text-display font-semibold">{home.vehicle_count}</p>
            </Link>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/drivers"
                className={`${themeClasses.raised} p-2 min-h-hit`}
                aria-label={`Drivers, ${home.driver_count}`}
              >
                <p className={themeClasses.caption}>Drivers</p>
                <p className="font-sans text-display font-semibold">{home.driver_count}</p>
              </Link>
              <Link
                href="/vehicles"
                className={`${themeClasses.raised} p-2 min-h-hit`}
                aria-label={`Vehicles, ${home.vehicle_count}`}
              >
                <p className={themeClasses.caption}>Vehicles</p>
                <p className="font-sans text-display font-semibold">{home.vehicle_count}</p>
              </Link>
            </div>
          )}
          {!individual && me?.role === "owner" ? (
            <Link href="/admins" className={`${themeClasses.raised} p-2 min-h-hit`}>
              <p className={themeClasses.title}>Admins</p>
              <p className={themeClasses.caption}>Create Admin</p>
            </Link>
          ) : null}
          <section>
            <h2 className={themeClasses.title}>Due soon or expired</h2>
            {home.expiring_vehicles.length === 0 ? (
              <div className="flex flex-col gap-2 mt-2">
                <p className={themeClasses.body}>No vehicles due soon.</p>
                {!individual ? <PrimaryLink href="/vehicles/new">Add vehicle</PrimaryLink> : null}
              </div>
            ) : (
              <ul className="flex flex-col gap-1 mt-2">
                {home.expiring_vehicles.map((v) => (
                  <li key={v.id}>
                    <Link
                      href={`/vehicles/${v.id}`}
                      className={`${themeClasses.raised} p-2 min-h-hit flex flex-col gap-0.5`}
                      aria-label={warningA11y(v.license_plate, v.warnings)}
                    >
                      <span className={themeClasses.label}>{vehicleLabel(v)}</span>
                      <span className={themeClasses.caption}>{v.license_plate}</span>
                      <ExpiryBadges warnings={v.warnings} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {!individual && home.driver_count === 0 ? (
            <PrimaryLink href="/drivers/new">Add driver</PrimaryLink>
          ) : null}
        </>
      ) : null}
    </AppShell>
  );
}
