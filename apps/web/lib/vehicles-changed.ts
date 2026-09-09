"use client";

import { clearQueryCache, invalidateCompany } from "./query-cache";

/** Notify Owner/Admin chrome to recompute US-28 Vehicles nav urgency. */
export const VEHICLES_CHANGED_EVENT = "fleet:vehicles-changed";

export function notifyVehiclesChanged(companyId?: string): void {
  if (typeof window === "undefined") return;
  if (companyId) invalidateCompany(companyId);
  else clearQueryCache();
  window.dispatchEvent(new Event(VEHICLES_CHANGED_EVENT));
}
