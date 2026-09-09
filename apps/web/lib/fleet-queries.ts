"use client";

import type { Driver, DriverVehicle, Home, Vehicle } from "@fleet/sdk";
import { api } from "./api";
import {
  cacheKey,
  cachedConditionalGet,
  invalidateCompany,
  type CacheEntry,
} from "./query-cache";

export type AdminRow = { id: string; email: string; role: "admin" };

export async function queryVehicles(
  companyId: string,
  opts?: { expiring?: boolean; force?: boolean },
) {
  const extra = opts?.expiring ? "expiring" : "";
  const key = cacheKey(companyId, "vehicles", extra);
  return cachedConditionalGet<{ items: Vehicle[] }>({
    key,
    force: opts?.force,
    fetch: (etag) => api.listVehicles(opts?.expiring, { etag }),
  });
}

export async function queryDrivers(companyId: string, opts?: { force?: boolean }) {
  const key = cacheKey(companyId, "drivers");
  return cachedConditionalGet<{ items: Driver[] }>({
    key,
    force: opts?.force,
    fetch: (etag) => api.listDrivers({ etag }),
  });
}

export async function queryAdmins(companyId: string, opts?: { force?: boolean }) {
  const key = cacheKey(companyId, "admins");
  return cachedConditionalGet<{ items: AdminRow[] }>({
    key,
    force: opts?.force,
    fetch: (etag) => api.listAdmins({ etag }),
  });
}

export async function queryHome(companyId: string, opts?: { force?: boolean }) {
  const key = cacheKey(companyId, "home");
  return cachedConditionalGet<Home>({
    key,
    force: opts?.force,
    fetch: (etag) => api.home({ etag }),
  });
}

export async function queryDriverVehicles(companyId: string, opts?: { force?: boolean }) {
  const key = cacheKey(companyId, "driver-vehicles");
  return cachedConditionalGet<{ items: DriverVehicle[] }>({
    key,
    force: opts?.force,
    fetch: (etag) => api.listDriverVehicles({ etag }),
  });
}

/** After vehicle/driver/admin mutations — drop tenant list cache so next read refetches. */
export function invalidateFleetLists(companyId: string): void {
  invalidateCompany(companyId);
}

export type { CacheEntry };
