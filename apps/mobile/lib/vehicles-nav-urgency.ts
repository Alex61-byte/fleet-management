import {
  vehiclesNavUrgency,
  type VehiclesNavUrgency,
} from "@fleet/sdk";
import { useCallback, useEffect, useState } from "react";
import { DeviceEventEmitter } from "react-native";
import { api } from "./api";
import { VEHICLES_CHANGED_EVENT } from "./vehicles-changed";

/** Load company vehicles and derive US-28 tab urgency; failures → none. */
export function useVehiclesNavUrgency(enabled: boolean): VehiclesNavUrgency {
  const [urgency, setUrgency] = useState<VehiclesNavUrgency>("none");

  const refresh = useCallback(async () => {
    if (!enabled) {
      setUrgency("none");
      return;
    }
    try {
      const { items } = await api.listVehicles();
      setUrgency(vehiclesNavUrgency(items));
    } catch {
      setUrgency("none");
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    const sub = DeviceEventEmitter.addListener(VEHICLES_CHANGED_EVENT, () => {
      void refresh();
    });
    return () => sub.remove();
  }, [enabled, refresh]);

  return urgency;
}
