import { DeviceEventEmitter } from "react-native";

/** Notify Owner/Admin chrome to recompute US-28 Vehicles tab urgency. */
export const VEHICLES_CHANGED_EVENT = "fleet:vehicles-changed";

export function notifyVehiclesChanged(): void {
  DeviceEventEmitter.emit(VEHICLES_CHANGED_EVENT);
}
