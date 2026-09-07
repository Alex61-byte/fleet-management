"use client";

import { FleetApiError, type DriverTravel, type HandoverActive } from "@fleet/sdk";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DriverHubLink, DriverShell } from "../../components/driver-shell";
import { SecondaryButton, Skeleton } from "../../components/ui";
import { themeClasses } from "../../../../design/tailwind.theme";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

/**
 * Driver start / hub after login (US-10).
 * Does not open next-travel or handover forms until the driver chooses them.
 */
export default function DriverHomePage() {
  const { me, ready } = useAuth();
  const router = useRouter();

  const [travel, setTravel] = useState<DriverTravel | null | undefined>(undefined);
  const [activeOut, setActiveOut] = useState<HandoverActive | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

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
      const t = await api.getDriverTravel();
      setTravel(t.travel);
      if (t.travel) {
        try {
          const h = await api.getDriverActiveHandover();
          setActiveOut(h.handover);
        } catch {
          setActiveOut(null);
        }
      } else {
        setActiveOut(null);
      }
    } catch (err) {
      setTravel(null);
      setActiveOut(null);
      setLoadError(err instanceof FleetApiError ? err.message : "Could not load home.");
    }
  }, []);

  useEffect(() => {
    if (!ready || !me || me.role !== "driver") return;
    void load();
  }, [ready, me, load]);

  if (!ready || !me || me.role !== "driver") {
    return (
      <main className={`${themeClasses.page} min-h-screen p-3`}>
        <div className="h-6 w-40 bg-disabled-surface rounded-md" />
      </main>
    );
  }

  const loading = travel === undefined;

  return (
    <DriverShell title="Home" showSignOut>
      <section className={themeClasses.panel} aria-label="Driver profile">
        {!me.email ? (
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-40" />
          </div>
        ) : (
          <>
            <p className={themeClasses.overline}>Driver</p>
            <p className={themeClasses.label}>{me.email}</p>
            <p className={`${themeClasses.caption} mt-1`}>
              Choose what you need. Handover is not opened until you start it.
            </p>
          </>
        )}
      </section>

      {loadError ? (
        <section className={themeClasses.panel} aria-label="Home status">
          <p className={themeClasses.errorText} role="alert">
            {loadError}
          </p>
          <SecondaryButton type="button" className="mt-2 w-full" onClick={() => void load()}>
            Retry
          </SecondaryButton>
        </section>
      ) : loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <nav className="flex flex-col gap-2" aria-label="Driver start">
          <DriverHubLink
            href="/driver/travel"
            title="Next travel"
            description={
              travel
                ? `${travel.vehicle?.label ?? "Vehicle"} · ${travel.vehicle?.license_plate ?? "—"}`
                : "Select a vehicle and odometer for your next travel."
            }
            badge={travel ? "Selected" : null}
          />
          <DriverHubLink
            href="/driver/handover"
            title="Vehicle handover"
            description={
              !travel
                ? "Select next travel first, then complete Out or In."
                : activeOut
                  ? "Out is open — complete Handover In when you return."
                  : "Record Handover Out when you take the vehicle, or In when you return."
            }
            badge={activeOut ? "Out open" : travel ? "Ready" : null}
          />
        </nav>
      )}

    </DriverShell>
  );
}
