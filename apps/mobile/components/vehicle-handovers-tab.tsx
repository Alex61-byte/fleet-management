import {
  FleetApiError,
  odometerUnitLabel,
  type HandoverDetail,
  type HandoverListItem,
  type HandoverType,
} from "@fleet/sdk";
import { useCallback, useEffect, useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Banner, SecondaryButton } from "./ui";
import { VehicleSideImageViewer } from "./vehicle-side-image-viewer";
import { api } from "../lib/api";

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function typeLabel(type: HandoverType): string {
  return type === "out" ? "Out" : "In";
}

function typeBadgeClass(type: HandoverType): string {
  return type === "out"
    ? "px-1 py-0.5 rounded-sm bg-surface-sunken text-text-secondary text-caption font-medium"
    : "px-1 py-0.5 rounded-sm bg-success-subtle text-success text-caption font-medium";
}

function driverLabel(item: Pick<HandoverListItem, "driver">): string {
  if (item.driver?.email) return item.driver.email;
  return "Unavailable";
}

function serviceSummary(item: HandoverListItem): string {
  return `${item.next_service_days}d · ${item.next_service_distance} ${item.next_service_distance_unit}`;
}

export function VehicleHandoversTab({
  vehicleId,
  offline,
}: {
  vehicleId: string;
  offline: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<HandoverListItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<HandoverDetail | null | undefined>(undefined);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const loadList = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await api.listVehicleHandovers(vehicleId);
      setItems(res.items);
    } catch (err) {
      setItems([]);
      setLoadError(err instanceof FleetApiError ? err.message : "Could not load handovers.");
    }
  }, [vehicleId]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(undefined);
      setDetailError(null);
      return;
    }
    let cancelled = false;
    setDetail(undefined);
    setDetailError(null);
    void (async () => {
      try {
        const d = await api.getVehicleHandover(vehicleId, selectedId);
        if (!cancelled) setDetail(d);
      } catch (err) {
        if (!cancelled) {
          setDetail(null);
          setDetailError(
            err instanceof FleetApiError ? err.message : "Could not load handover detail.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, vehicleId]);

  const loading = items === null && !loadError;

  return (
    <View className="gap-2 pt-2" accessibilityLabel="Handover history">
      {loadError ? (
        <>
          <Banner tone="danger">{loadError}</Banner>
          <SecondaryButton
            title="Retry"
            disabled={offline}
            onPress={() => void loadList()}
          />
        </>
      ) : loading ? (
        <Text className="text-caption text-text-secondary">Loading handovers…</Text>
      ) : items!.length === 0 ? (
        <View className="py-8 items-center gap-1">
          <Text className="font-semibold text-body text-text-primary">No handovers yet.</Text>
          <Text className="text-body text-text-primary text-center">
            Out and In records for this vehicle will show up here.
          </Text>
        </View>
      ) : (
        <>
          <Text className="text-caption text-text-secondary">{items!.length} handovers</Text>
          <View className="gap-1">
            {items!.map((item) => {
              const t = typeLabel(item.type);
              const when = formatWhen(item.created_at);
              const driver = driverLabel(item);
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${t}, ${when}, ${driver}, mileage ${item.mileage} ${item.mileage_unit}`}
                  onPress={() => setSelectedId(item.id)}
                  className="min-h-hit rounded-md border border-divider bg-surface px-2 py-2 gap-0.5"
                >
                  <View className="flex-row items-center gap-1 flex-wrap">
                    <Text className={typeBadgeClass(item.type)}>{t}</Text>
                    <Text className="text-caption text-text-secondary">{when}</Text>
                  </View>
                  <Text className="text-caption text-text-secondary">
                    {driver} · {item.mileage} {item.mileage_unit}
                  </Text>
                  <Text className="text-caption text-text-secondary">{serviceSummary(item)}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      <Modal
        visible={selectedId != null}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setSelectedId(null);
          setViewerIndex(null);
        }}
      >
        <View
          className="flex-1 bg-canvas"
          style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
          accessibilityViewIsModal
        >
          <View className="h-app-bar px-2 flex-row items-center gap-2 border-b border-divider bg-surface-raised">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close handover detail"
              onPress={() => {
                setSelectedId(null);
                setViewerIndex(null);
              }}
              className="h-hit min-w-hit px-2 items-center justify-center"
              hitSlop={8}
            >
              <Text className="text-body font-semibold text-text-primary">Back</Text>
            </Pressable>
            <Text
              className="flex-1 font-semibold text-label text-text-primary"
              numberOfLines={1}
            >
              Handover detail
              {detail ? ` · ${typeLabel(detail.type)}` : ""}
            </Text>
          </View>

          <ScrollView className="flex-1" contentContainerClassName="p-2 gap-2">
            {detailError ? <Banner tone="danger">{detailError}</Banner> : null}
            {detail === undefined && !detailError ? (
              <Text className="text-caption text-text-secondary">Loading…</Text>
            ) : null}
            {detail ? (
              <View className="gap-2">
                <DetailRow label="When" value={formatWhen(detail.created_at)} />
                <DetailRow label="Driver" value={driverLabel(detail)} />
                {detail.vehicle ? (
                  <DetailRow
                    label="Vehicle"
                    value={`${detail.vehicle.label} · ${detail.vehicle.license_plate}`}
                  />
                ) : null}
                <DetailRow
                  label={odometerUnitLabel(detail.mileage_unit)}
                  value={`${detail.mileage} ${detail.mileage_unit}`}
                />
                <DetailRow label="Next service (days)" value={String(detail.next_service_days)} />
                <DetailRow
                  label={`Next service (${odometerUnitLabel(detail.next_service_distance_unit)})`}
                  value={`${detail.next_service_distance} ${detail.next_service_distance_unit}`}
                />
                <View className="gap-0.5">
                  <Text className="font-medium text-label text-text-primary">Damages</Text>
                  {detail.damages_text?.trim() ? (
                    <Text className="text-body text-text-primary">{detail.damages_text}</Text>
                  ) : (
                    <Text className="text-caption text-text-secondary">No damages noted.</Text>
                  )}
                </View>
                <View className="gap-1">
                  <Text className="font-medium text-label text-text-primary">Damage photos</Text>
                  {detail.damage_images.length === 0 ? (
                    <Text className="text-caption text-text-secondary">No damage photos.</Text>
                  ) : (
                    <View className="flex-row flex-wrap gap-1">
                      {detail.damage_images.map((img, index) => (
                        <Pressable
                          key={img.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Damage photo ${index + 1}`}
                          onPress={() => setViewerIndex(index)}
                          className="h-6 w-6 rounded-md overflow-hidden bg-surface-sunken border border-border"
                        >
                          <Image
                            source={{ uri: img.url }}
                            className="h-full w-full"
                            resizeMode="cover"
                          />
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            ) : null}
          </ScrollView>

          <VehicleSideImageViewer
            open={
              viewerIndex != null &&
              detail != null &&
              detail.damage_images[viewerIndex] != null
            }
            sideLabel="Damage"
            imageUrl={
              viewerIndex != null && detail
                ? (detail.damage_images[viewerIndex]?.url ?? "")
                : ""
            }
            title={
              viewerIndex != null && detail
                ? `Damage photo ${viewerIndex + 1} of ${detail.damage_images.length}`
                : undefined
            }
            onClose={() => setViewerIndex(null)}
          />
        </View>
      </Modal>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-0.5">
      <Text className="font-medium text-label text-text-primary">{label}</Text>
      <Text className="text-body text-text-primary">{value}</Text>
    </View>
  );
}
