"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { VehicleForm } from "../../../components/vehicle-form";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";
import { notifyVehiclesChanged } from "../../../lib/vehicles-changed";

export default function NewVehiclePage() {
  const { offline } = useAuth();
  const router = useRouter();
  return (
    <AppShell title="Add vehicle">
      <VehicleForm
        offline={offline}
        submitLabel="Save vehicle"
        onSubmit={async (body) => {
          const created = await api.createVehicle(body);
          notifyVehiclesChanged();
          router.replace(`/vehicles/${created.id}`);
          return created;
        }}
      />
    </AppShell>
  );
}
