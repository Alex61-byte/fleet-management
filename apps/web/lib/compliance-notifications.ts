"use client";

import {
  notificationMenuItems,
  type NotificationMenuItem,
} from "@fleet/sdk";
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { useAuth } from "./auth-context";
import { queryVehicles } from "./fleet-queries";
import { VEHICLES_CHANGED_EVENT } from "./vehicles-changed";

export type ComplianceNotificationsState = {
  items: NotificationMenuItem[];
  truncated: boolean;
  count: number;
  loading: boolean;
  error: string | null;
  offline: boolean;
  refresh: () => Promise<void>;
};

/** OA Global Header feed — compliance + service + open_out (ADR-017). */
export function useComplianceNotifications(
  enabled: boolean,
  offline = false,
): ComplianceNotificationsState {
  const { me } = useAuth();
  const [items, setItems] = useState<NotificationMenuItem[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !me) {
      setItems([]);
      setTruncated(false);
      setCount(0);
      setLoading(false);
      setError(null);
      return;
    }
    if (offline) {
      setItems([]);
      setTruncated(false);
      setCount(0);
      setLoading(false);
      setError("offline");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const isCompany = me.account_kind === "company";
      const [vehRes, serviceRes, openRes] = await Promise.all([
        queryVehicles(me.company_id),
        api.listServiceDue().catch(() => ({ items: [] })),
        isCompany
          ? api.listOpenHandovers().catch(() => ({ items: [] }))
          : Promise.resolve({ items: [] }),
      ]);
      const projected = notificationMenuItems({
        vehicles: vehRes.data.items,
        serviceDue: serviceRes.items,
        openOuts: openRes.items,
      });
      setItems(projected.items);
      setTruncated(projected.truncated);
      setCount(projected.items.length);
    } catch {
      setItems([]);
      setTruncated(false);
      setCount(0);
      setError("Could not load alerts.");
    } finally {
      setLoading(false);
    }
  }, [enabled, offline, me]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    const onChange = () => void refresh();
    window.addEventListener(VEHICLES_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(VEHICLES_CHANGED_EVENT, onChange);
  }, [enabled, refresh]);

  return { items, truncated, count, loading, error, offline, refresh };
}
