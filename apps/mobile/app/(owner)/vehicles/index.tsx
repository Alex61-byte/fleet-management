import {
  formatVehicleMileage,
  odometerUnitLabel,
  warningA11y,
  vehicleLabel,
  type Vehicle,
} from "@fleet/sdk";
import { Link, Stack } from "expo-router";
import { OwnerHeaderNotifications } from "../../../components/owner-header-notifications";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Banner, ExpiryBadges, PrimaryButton, PrimaryLink } from "../../../components/ui";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";

export default function VehiclesList() {
  const { offline } = useAuth();
  const [items, setItems] = useState<Vehicle[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems((await api.listVehicles()).data?.items ?? []);
    } catch {
      setError("Could not load vehicles.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-2 gap-2">
      <Stack.Screen
        options={{
          title: "Vehicles",
          headerRight: () => (
            <OwnerHeaderNotifications
              trailing={
                <Link href="/(owner)/vehicles/new" className="text-brand text-label font-semibold">
                  Add vehicle
                </Link>
              }
            />
          ),
        }}
      />
      {offline ? <Banner tone="warning">You are offline.</Banner> : null}
      {loading ? (
        <View className="h-12 bg-disabled-surface rounded-md" />
      ) : error ? (
        <>
          <Banner>{error}</Banner>
          <PrimaryButton title="Retry" onPress={() => void load()} />
        </>
      ) : items && items.length === 0 ? (
        <>
          <Text className="text-body text-text-primary">No vehicles yet.</Text>
          <PrimaryLink href="/(owner)/vehicles/new" title="Add vehicle" />
        </>
      ) : (
        items?.map((v) => (
          <Link key={v.id} href={`/(owner)/vehicles/${v.id}`} asChild>
            <Pressable
              className="bg-surface-raised border border-border rounded-md p-2 min-h-hit gap-1"
              accessibilityLabel={warningA11y(
                `${vehicleLabel(v)}, ${v.license_plate}${v.has_side_images ? ", has photos" : ""}`,
                v.warnings,
                v.custom_expirations,
              )}
            >
              <Text className="font-medium text-label text-text-primary">
                {vehicleLabel(v)}
                {v.has_side_images === true ? " · Photos" : ""}
              </Text>
              <Text className="text-caption text-text-secondary">{v.license_plate}</Text>
              {v.mileage != null ? (
                <Text className="text-caption text-text-secondary">
                  {formatVehicleMileage(v.mileage, v.mileage_unit)} ·{" "}
                  {odometerUnitLabel(v.mileage_unit ?? "km")}
                </Text>
              ) : null}
              <ExpiryBadges warnings={v.warnings} customExpirations={v.custom_expirations} />
            </Pressable>
          </Link>
        ))
      )}
    </ScrollView>
  );
}
