import { FleetApiError, type Vehicle } from "@fleet/sdk";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Banner, PrimaryButton } from "../../../components/ui";
import { VehicleForm } from "../../../components/vehicle-form";
import { notifyVehiclesChanged } from "../../../lib/vehicles-changed";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";

export default function EditVehicle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { offline } = useAuth();
  const router = useRouter();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setDenied(false);
    setError("");
    try {
      setVehicle(await api.getVehicle(String(id)));
    } catch (err) {
      if (err instanceof FleetApiError && (err.status === 404 || err.status === 403)) setDenied(true);
      else setError("Could not load vehicle.");
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  if (denied) {
    return (
      <View className="flex-1 bg-surface p-2">
        <Stack.Screen options={{ title: "Vehicles" }} />
        <Text className="font-semibold text-title">Not allowed</Text>
        <Text className="text-body text-text-secondary">This vehicle is not available.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-2 gap-2">
      <Stack.Screen options={{ title: "Edit vehicle" }} />
      {error ? (
        <>
          <Banner>{error}</Banner>
          <PrimaryButton title="Retry" onPress={() => void load()} />
        </>
      ) : vehicle ? (
        <VehicleForm
          initial={vehicle}
          offline={offline}
          submitLabel="Save vehicle"
          onSubmit={async (body) => {
            await api.patchVehicle(String(id), body);
            notifyVehiclesChanged();
            router.replace("/(owner)/vehicles");
          }}
        />
      ) : (
        <View className="h-40 bg-disabled-surface rounded-md" />
      )}
    </ScrollView>
  );
}
