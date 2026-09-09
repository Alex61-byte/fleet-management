"use client";

import {
  vehiclesNavUrgency,
  type VehiclesNavUrgency,
} from "@fleet/sdk";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import { queryVehicles } from "./fleet-queries";
import { VEHICLES_CHANGED_EVENT } from "./vehicles-changed";

/** Load company vehicles and derive US-28 nav urgency; failures → none. */
export function useVehiclesNavUrgency(enabled: boolean): VehiclesNavUrgency {
  const { me } = useAuth();
  const [urgency, setUrgency] = useState<VehiclesNavUrgency>("none");

  const refresh = useCallback(async () => {
    if (!enabled || !me) {
      setUrgency("none");
      return;
    }
    try {
      const res = await queryVehicles(me.company_id);
      setUrgency(vehiclesNavUrgency(res.data.items));
    } catch {
      setUrgency("none");
    }
  }, [enabled, me]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    const onChange = () => void refresh();
    window.addEventListener(VEHICLES_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(VEHICLES_CHANGED_EVENT, onChange);
  }, [enabled, refresh]);

  return urgency;
}
