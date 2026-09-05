/** Notify Owner/Admin chrome to recompute US-28 Vehicles nav urgency. */
export const VEHICLES_CHANGED_EVENT = "fleet:vehicles-changed";

export function notifyVehiclesChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(VEHICLES_CHANGED_EVENT));
}
