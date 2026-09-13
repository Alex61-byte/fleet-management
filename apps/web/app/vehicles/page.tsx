"use client";

import {
  collectVehicleListCustomSortFields,
  formatVehicleMileage,
  odometerUnitLabel,
  projectVehiclesList,
  VEHICLE_LIST_SORT_BUILTIN_FIELDS,
  warningA11y,
  vehicleLabel,
  type Vehicle,
  type VehicleCustodyFilter,
  type VehicleListSortDirection,
  type VehicleListSortField,
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

type SortMode = "default" | VehicleListSortField;

export default function VehiclesPage() {
  const { me, ready } = useAuth();
  const [items, setItems] = useState<Vehicle[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [custody, setCustody] = useState<VehicleCustodyFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [sortDir, setSortDir] = useState<VehicleListSortDirection>("asc");

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

  const customSortFields = useMemo(
    () => (items ? collectVehicleListCustomSortFields(items) : []),
    [items],
  );

  const listSort = useMemo(() => {
    if (sortMode === "default") return "default" as const;
    return { field: sortMode, direction: sortDir };
  }, [sortMode, sortDir]);

  const visible = useMemo(() => {
    if (!items) return [];
    return projectVehiclesList(items, { custody: effectiveCustody, sort: listSort });
  }, [items, effectiveCustody, listSort]);

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
        <div className="flex flex-col gap-2">
          <div
            className={themeClasses.listToolbar}
            role="group"
            aria-label="Vehicles list filter and sort"
          >
            <span className={themeClasses.listToolbarCount}>
              {filterActive
                ? `${visible.length} of ${total} vehicles`
                : `${total} vehicles`}
            </span>
            {isCompany ? (
              <SelectInput
                label="Custody"
                aria-label="Filter by custody"
                value={custody}
                onChange={(e) => setCustody(e.target.value as VehicleCustodyFilter)}
                className="w-28"
              >
                <option value="all">All</option>
                <option value="out">Out</option>
                <option value="in">In</option>
              </SelectInput>
            ) : null}
            <SelectInput
              label="Sort by"
              aria-label="Sort by expiration type"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="w-44"
            >
              <option value="default">Default order</option>
              <option value="any">Any expiration</option>
              {VEHICLE_LIST_SORT_BUILTIN_FIELDS.map((f) => (
                <option key={f.field} value={f.field}>
                  {f.label}
                </option>
              ))}
              {customSortFields.map((f) => (
                <option key={f.field} value={f.field}>
                  {f.label}
                </option>
              ))}
            </SelectInput>
            {sortMode !== "default" ? (
              <SelectInput
                label="Order"
                aria-label="Sort direction"
                value={sortDir}
                onChange={(e) =>
                  setSortDir(e.target.value as VehicleListSortDirection)
                }
                className="w-36"
              >
                <option value="asc">Soonest first</option>
                <option value="desc">Furthest first</option>
              </SelectInput>
            ) : null}
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
