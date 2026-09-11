import {
  complianceNotificationsA11yLabel,
  odometerUnitLabel,
  vehicleLabel,
  type NotificationMenuItem,
} from "@fleet/sdk";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NavIcon } from "./nav-icons";
import { Banner, SecondaryButton } from "./ui";

const FG = "#0c1219";
const DANGER = "#b42318";
const INVERSE = "#ffffff";

function formatDateOn(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  if (!y || !m || !d) return dateIso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function statusChrome(item: NotificationMenuItem): {
  label: string;
  expired: boolean;
} {
  if (item.section === "compliance") {
    return {
      label: item.state === "expired" ? "Expired" : "Due soon",
      expired: item.state === "expired",
    };
  }
  if (item.section === "service") {
    return {
      label: item.state === "due" ? "Due" : "Approaching",
      expired: item.state === "due",
    };
  }
  return { label: "Out open", expired: false };
}

function detailLine(item: NotificationMenuItem): string {
  if (item.section === "compliance" && item.date_on) return formatDateOn(item.date_on);
  if (item.section === "service") {
    if (item.distance_remaining != null && item.distance_unit) {
      const unit = odometerUnitLabel(item.distance_unit);
      if (item.state === "approaching") return `${item.distance_remaining} ${unit} remaining`;
      return item.distance_remaining <= 0 ? "Due by distance" : `${item.distance_remaining} ${unit} left`;
    }
    return item.state === "due" ? "Due by days" : "Service soon";
  }
  return item.driver_email ?? "Driver unknown";
}

function NotificationItemRow({
  item,
  onPress,
}: {
  item: NotificationMenuItem;
  onPress: () => void;
}) {
  const chrome = statusChrome(item);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-list-row w-full px-3 py-2 border-b border-divider bg-surface-raised"
    >
      <Text className="text-label font-medium text-text-primary">{vehicleLabel(item)}</Text>
      <Text className="text-caption text-text-secondary">{item.license_plate}</Text>
      <View className="flex-row flex-wrap items-center gap-1 mt-1">
        <Text className="text-caption text-text-secondary">{item.field_label}</Text>
        <View
          className={`px-1 py-0.5 rounded-full ${
            chrome.expired ? "bg-danger-subtle" : "bg-warning-subtle"
          }`}
        >
          <Text
            className={`text-caption font-medium ${
              chrome.expired ? "text-danger" : "text-warning"
            }`}
          >
            {chrome.label}
          </Text>
        </View>
        <Text className="text-caption text-text-secondary">{detailLine(item)}</Text>
      </View>
    </Pressable>
  );
}

export function NotificationControl({
  count,
  loading,
  error,
  offline,
  items,
  truncated,
  onRetry,
}: {
  count: number;
  loading: boolean;
  error: string | null;
  offline: boolean;
  items: NotificationMenuItem[];
  truncated: boolean;
  onRetry: () => void;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const showBadge = count > 0 && !loading && !error && !offline;
  const a11y = complianceNotificationsA11yLabel(showBadge ? count : 0);

  function close() {
    setOpen(false);
  }

  function openItem(item: NotificationMenuItem) {
    close();
    router.push(`/(owner)/vehicles/${item.vehicle_id}`);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11y}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        className="h-hit w-hit items-center justify-center rounded-md"
        hitSlop={8}
      >
        <View className="relative items-center justify-center">
          <NavIcon name="bell" color={FG} size={20} />
          {showBadge ? (
            <View
              className="absolute -top-1 -right-2 min-h-[18px] min-w-[18px] px-0.5 rounded-full items-center justify-center"
              style={{ backgroundColor: DANGER }}
              accessible={false}
            >
              <Text style={{ color: INVERSE, fontSize: 11, fontWeight: "600" }}>{count}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={close}
        accessibilityViewIsModal
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(12,18,25,0.45)" }}>
          <Pressable className="flex-1" onPress={close} accessibilityLabel="Dismiss" />
          <View
            className="bg-surface-raised border border-border rounded-t-lg overflow-hidden"
            style={{ maxHeight: "70%", paddingBottom: Math.max(insets.bottom, 8) }}
          >
            <View className="h-app-bar px-3 flex-row items-center justify-between border-b border-divider">
              <Text className="text-label font-semibold text-text-primary">Alerts</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={close}
                className="min-h-hit px-2 items-center justify-center"
              >
                <Text className="text-label font-medium text-text-primary">Close</Text>
              </Pressable>
            </View>

            {offline || error === "offline" ? (
              <View className="p-3">
                <Banner tone="warning">You are offline.</Banner>
              </View>
            ) : loading ? (
              <View className="p-6 items-center" accessibilityState={{ busy: true }}>
                <ActivityIndicator />
              </View>
            ) : error ? (
              <View className="p-3 gap-2">
                <Banner>{error}</Banner>
                <SecondaryButton title="Try again" onPress={onRetry} />
              </View>
            ) : items.length === 0 ? (
              <View className="p-6 items-center gap-1">
                <Text className="text-label font-semibold text-text-primary text-center">
                  No alerts.
                </Text>
                <Text className="text-caption text-text-secondary text-center">
                  Compliance, service, and open handovers are clear.
                </Text>
              </View>
            ) : (
              <ScrollView>
                {items.map((item) => (
                  <NotificationItemRow
                    key={`${item.section}:${item.vehicle_id}:${item.field}:${item.handover_id ?? ""}`}
                    item={item}
                    onPress={() => openItem(item)}
                  />
                ))}
              </ScrollView>
            )}

            {truncated ? (
              <View className="px-3 py-2 border-t border-divider">
                <Text className="text-caption text-text-secondary">Showing 50 most urgent.</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}
