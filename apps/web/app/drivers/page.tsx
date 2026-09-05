"use client";

import type { Driver } from "@fleet/sdk";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell, ErrorRetry } from "../../components/app-shell";
import { PrimaryLink, Skeleton } from "../../components/ui";
import { themeClasses } from "../../../../design/tailwind.theme";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

function statusCopy(d: Driver) {
  if (!d.login_enabled) return "Login disabled";
  if (d.must_change_password) return "Invite pending";
  return "Can sign in";
}

export default function DriversPage() {
  const { me, ready } = useAuth();
  const [items, setItems] = useState<Driver[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await api.listDrivers();
      setItems(res.items);
    } catch {
      setError("Could not load drivers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ready && me && me.role !== "driver") void load();
  }, [ready, me]);

  return (
    <AppShell
      title="Drivers"
      action={<PrimaryLink href="/drivers/new">Add driver</PrimaryLink>}
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
          <p className={themeClasses.body}>No drivers yet. Invite a driver by email — they set their own password.</p>
          <PrimaryLink href="/drivers/new">Add driver</PrimaryLink>
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {items?.map((d) => (
            <li key={d.id}>
              <Link
                href={`/drivers/${d.id}`}
                className={`${themeClasses.raised} p-2 min-h-hit flex flex-col`}
                aria-label={`${d.email} ${statusCopy(d)}`}
              >
                <span className={themeClasses.label}>{d.email}</span>
                <span className={themeClasses.caption}>{statusCopy(d)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
