"use client";

import {
  formatVehicleMileage,
  odometerUnitLabel,
  projectVehiclesList,
  warningA11y,
  vehicleLabel,
  type Vehicle,
  type VehicleCustodyFilter,
  type VehicleListSort,
} from "@fleet/sdk";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell, ErrorRetry } from "../../components/app-shell";
import {
  ExpiryBadges,
  OpenOutCustodyCue,
  openOutCustodyA11y,
  PrimaryLink,
  SelectInput,
  Skeleton,
} from "../../components/ui";
import { themeClasses } from "../../../../design/tailwind.theme";
import { useAuth } from "../../lib/auth-context";
import { queryVehicles } from "../../lib/fleet-queries";

export default function VehiclesPage() {
  const { me, ready } = useAuth();
  const [items, setItems] = useState<Vehicle[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [custody, setCustody] = useState<VehicleCustodyFilter>("all");
  const [sort, setSort] = useState<VehicleListSort>("default");

  const isCompany = me?.account_kind === "company";

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

  const effectiveCustody: VehicleCustodyFilter = isCompany ? custody : "all";

  const visible = useMemo(() => {
    if (!items) return [];
    return projectVehiclesList(items, { custody: effectiveCustody, sort });
  }, [items, effectiveCustody, sort]);

  const filterActive = isCompany && custody !== "all";
  const total = items?.length ?? 0;

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
        <div className="flex flex-col gap-1">
          <div
            className={`${themeClasses.toolbar} flex-wrap h-auto min-h-hit py-1`}
            role="group"
            aria-label="Vehicles list filter and sort"
          >
            <span className={`${themeClasses.caption} font-tabular shrink-0`}>
              {filterActive
                ? `${visible.length} of ${total} vehicles`
                : `${total} vehicles`}
            </span>
            {isCompany ? (
              <label className="flex flex-row items-center gap-1 min-w-0">
                <span className={themeClasses.label}>Custody</span>
                <SelectInput
                  aria-label="Filter by custody"
                  value={custody}
                  onChange={(e) => setCustody(e.target.value as VehicleCustodyFilter)}
                  className="min-w-[7rem]"
                >
                  <option value="all">All</option>
                  <option value="out">Out</option>
                  <option value="in">In</option>
                </SelectInput>
              </label>
            ) : null}
            <label className="flex flex-row items-center gap-1 min-w-0">
              <span className={themeClasses.label}>Sort</span>
              <SelectInput
                aria-label="Sort by expiration"
                value={sort}
                onChange={(e) => setSort(e.target.value as VehicleListSort)}
                className="min-w-[11rem]"
              >
                <option value="default">Default</option>
                <option value="expiration_asc">Soonest expiration</option>
                <option value="expiration_desc">Furthest expiration</option>
              </SelectInput>
            </label>
          </div>
          {visible.length === 0 ? (
            <div className="flex flex-col gap-1 py-2">
              <p className={themeClasses.sectionTitle}>No vehicles match.</p>
              <p className={themeClasses.body}>
                Try a different custody filter or sort.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {visible.map((v) => (
                <li key={v.id}>
                  <Link
                    href={`/vehicles/${v.id}`}
                    className={`${themeClasses.raised} p-2 min-h-hit flex flex-col gap-0.5`}
                    aria-label={[
                      warningA11y(
                        `${vehicleLabel(v)}, ${v.license_plate}${v.has_side_images ? ", has photos" : ""}`,
                        v.warnings,
                        v.custom_expirations,
                      ),
                      openOutCustodyA11y(v.open_out),
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  >
                    <span
                      className={`${themeClasses.label} inline-flex flex-wrap items-center gap-1`}
                    >
                      {vehicleLabel(v)}
                      {v.has_side_images === true ? (
                        <span className={themeClasses.vehicleSidePresence}>Photos</span>
                      ) : null}
                      <OpenOutCustodyCue openOut={v.open_out} />
                    </span>
                    <span className={themeClasses.caption}>{v.license_plate}</span>
                    {v.mileage != null ? (
                      <span className={themeClasses.caption}>
                        {formatVehicleMileage(v.mileage, v.mileage_unit)} ·{" "}
                        {odometerUnitLabel(v.mileage_unit ?? "km")}
                      </span>
                    ) : null}
                    <ExpiryBadges
                      warnings={v.warnings}
                      customExpirations={v.custom_expirations}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </AppShell>
  );
}
