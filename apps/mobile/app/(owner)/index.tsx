import { warningA11y, vehicleLabel, type Home } from "@fleet/sdk";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Banner, ExpiryBadges, PrimaryButton, PrimaryLink } from "../../components/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";

export default function OwnerHome() {
  const { me, offline } = useAuth();
  const [home, setHome] = useState<Home | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setError("");
    setLoading(true);
    try {
      setHome(await api.home());
    } catch {
      setError("Could not load home.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const individual = me?.account_kind === "individual";

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-2 gap-2">
      <Text className="font-semibold text-title text-text-primary">Home</Text>
      {individual ? (
        <Text className="text-caption text-text-secondary">Owner · personal vehicles</Text>
      ) : null}
      <PrimaryLink href="/(owner)/vehicles/new" title="Add vehicle" />
      {offline ? <Banner tone="warning">You are offline.</Banner> : null}
      {loading ? (
        <>
          <View className="h-20 bg-disabled-surface rounded-md" />
          <View className="h-20 bg-disabled-surface rounded-md" />
          <View className="h-12 bg-disabled-surface rounded-md" />
        </>
      ) : error ? (
        <>
          <Banner>{error}</Banner>
          <PrimaryButton title="Retry" onPress={() => void load()} />
        </>
      ) : home ? (
        <>
          {!individual ? (
            <Link href="/(owner)/drivers" asChild>
              <Pressable
                className="bg-surface-raised border border-border rounded-md shadow-sm p-2 min-h-hit"
                accessibilityLabel={`Drivers, ${home.driver_count}`}
              >
                <Text className="text-caption text-text-secondary">Drivers</Text>
                <Text className="text-display font-semibold text-text-primary">{home.driver_count}</Text>
              </Pressable>
            </Link>
          ) : null}
          <Link href="/(owner)/vehicles" asChild>
            <Pressable
              className="bg-surface-raised border border-border rounded-md p-2 min-h-hit"
              accessibilityLabel={`Vehicles, ${home.vehicle_count}`}
            >
              <Text className="text-caption text-text-secondary">Vehicles</Text>
              <Text className="text-display font-semibold text-text-primary">{home.vehicle_count}</Text>
            </Pressable>
          </Link>
          {!individual && me?.role === "owner" ? (
            <Link href="/(owner)/more/admins" asChild>
              <Pressable className="bg-surface-raised border border-border rounded-md p-2 min-h-hit">
                <Text className="font-semibold text-title text-text-primary">Admins</Text>
                <Text className="text-caption text-text-secondary">Create Admin</Text>
              </Pressable>
            </Link>
          ) : null}
          <Text className="font-semibold text-title text-text-primary">Due soon or expired</Text>
          {home.expiring_vehicles.length === 0 ? (
            <Text className="text-body text-text-primary">No vehicles due soon.</Text>
          ) : (
            home.expiring_vehicles.map((v) => (
              <Link key={v.id} href={`/(owner)/vehicles/${v.id}`} asChild>
                <Pressable
                  className="bg-surface-raised border border-border rounded-md p-2 min-h-hit gap-1"
                  accessibilityLabel={warningA11y(v.license_plate, v.warnings)}
                >
                  <Text className="font-medium text-label text-text-primary">{vehicleLabel(v)}</Text>
                  <Text className="text-caption text-text-secondary">{v.license_plate}</Text>
                  <ExpiryBadges warnings={v.warnings} />
                </Pressable>
              </Link>
            ))
          )}
          {!individual && home.driver_count === 0 ? (
            <PrimaryLink href="/(owner)/drivers/new" title="Add driver" />
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}
