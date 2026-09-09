"use client";

import { FleetApiError, type Vehicle } from "@fleet/sdk";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell, Denied, ErrorRetry } from "../../../components/app-shell";
import { VehicleForm } from "../../../components/vehicle-form";
import { Skeleton } from "../../../components/ui";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";
import { notifyVehiclesChanged } from "../../../lib/vehicles-changed";

export default function EditVehiclePage() {
  const { id } = useParams<{ id: string }>();
  const { me, offline } = useAuth();
  const router = useRouter();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    setDenied(false);
    try {
      setVehicle(await api.getVehicle(id));
    } catch (err) {
      if (err instanceof FleetApiError && (err.status === 404 || err.status === 403)) setDenied(true);
      else setError("Could not load vehicle.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  if (denied) {
    return (
      <AppShell title="Vehicles">
        <Denied title="Not allowed" body="This vehicle is not available." />
      </AppShell>
    );
  }

  return (
    <AppShell title="Edit vehicle">
      {loading ? (
        <Skeleton className="h-40" />
      ) : error ? (
        <ErrorRetry message={error} onRetry={() => void load()} />
      ) : vehicle ? (
        <VehicleForm
          key={vehicle.id}
          initial={vehicle}
          offline={offline}
          submitLabel="Save vehicle"
          onVehicleChange={setVehicle}
          onSubmit={async (body) => {
            const next = await api.patchVehicle(id, body);
            setVehicle(next);
            notifyVehiclesChanged(me?.company_id);
            router.replace("/vehicles");
            return next;
          }}
        />
      ) : null}
    </AppShell>
  );
}
