"use client";

import { FleetApiError, type DriverTravel } from "@fleet/sdk";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DriverHandoverPanel } from "../../../components/driver-handover-panel";
import { DriverBackLink, DriverShell } from "../../../components/driver-shell";
import { SecondaryButton, Skeleton } from "../../../components/ui";
import { themeClasses } from "../../../../../design/tailwind.theme";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";
import Link from "next/link";

export default function DriverHandoverPage() {
  const { me, ready, offline } = useAuth();
  const router = useRouter();
  const [travel, setTravel] = useState<DriverTravel | null | undefined>(undefined);
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
    } catch (err) {
      setTravel(null);
      setLoadError(err instanceof FleetApiError ? err.message : "Could not load travel data.");
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
    <DriverShell title="Handover">
      <DriverBackLink />
      {loadError ? (
        <section className={themeClasses.panel}>
          <p className={themeClasses.errorText} role="alert">
            {loadError}
          </p>
          <SecondaryButton type="button" className="mt-2 w-full" onClick={() => void load()}>
            Retry
          </SecondaryButton>
        </section>
      ) : loading ? (
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : !travel ? (
        <section className={themeClasses.panel} aria-label="Handover">
          <h2 className={themeClasses.sectionTitle}>Vehicle handover</h2>
          <p className={themeClasses.body}>
            Select a vehicle for next travel before you can complete a handover.
          </p>
          <Link
            href="/driver/travel"
            className={`${themeClasses.buttonPrimary} mt-2 inline-flex items-center justify-center no-underline w-full`}
          >
            Go to Next travel
          </Link>
        </section>
      ) : (
        <DriverHandoverPanel travel={travel} offline={offline} onHandoverSaved={() => void load()} />
      )}
    </DriverShell>
  );
}
