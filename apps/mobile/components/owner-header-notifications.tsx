import { createContext, useContext, type ReactNode } from "react";
import { View } from "react-native";
import {
  useComplianceNotifications,
  type ComplianceNotificationsState,
} from "../lib/compliance-notifications";
import { useAuth } from "../lib/auth";
import { NotificationControl } from "./notification-menu";

const OwnerNotificationsContext = createContext<ComplianceNotificationsState | null>(null);

export function OwnerNotificationsProvider({ children }: { children: ReactNode }) {
  const { offline } = useAuth();
  const state = useComplianceNotifications(true, offline);
  return (
    <OwnerNotificationsContext.Provider value={state}>
      {children}
    </OwnerNotificationsContext.Provider>
  );
}

function useOwnerNotifications(): ComplianceNotificationsState {
  const ctx = useContext(OwnerNotificationsContext);
  if (!ctx) {
    throw new Error("OwnerNotificationsProvider required");
  }
  return ctx;
}

/** Global Header notification control for OA stack/tab headers (US-68–US-76). */
export function OwnerHeaderNotifications({ trailing }: { trailing?: ReactNode }) {
  const n = useOwnerNotifications();
  return (
    <View className="flex-row items-center gap-2 pr-2">
      <NotificationControl
        count={n.count}
        loading={n.loading}
        error={n.error}
        offline={n.offline}
        items={n.items}
        truncated={n.truncated}
        onRetry={() => void n.refresh()}
      />
      {trailing}
    </View>
  );
}
