import { Stack, useRouter } from "expo-router";
import { ScrollView } from "react-native";
import { VehicleForm } from "../../../components/vehicle-form";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { notifyVehiclesChanged } from "../../../lib/vehicles-changed";

export default function NewVehicle() {
  const { offline } = useAuth();
  const router = useRouter();
  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-2 gap-2">
      <Stack.Screen options={{ title: "Add vehicle" }} />
      <VehicleForm
        offline={offline}
        submitLabel="Save vehicle"
        onSubmit={async (body) => {
          const created = await api.createVehicle(body);
          notifyVehiclesChanged();
          router.replace(`/(owner)/vehicles/${created.id}`);
          return created;
        }}
      />
    </ScrollView>
  );
}
