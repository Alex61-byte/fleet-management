import {
  collectVehicleListCustomSortFields,
  formatVehicleMileage,
  odometerUnitLabel,
  projectVehiclesList,
  VEHICLE_LIST_SORT_BUILTIN_FIELDS,
  warningA11y,
  vehicleLabel,
  type Vehicle,
  type VehicleCustodyFilter,
  type VehicleListSortDirection,
  type VehicleListSortField,
} from "@fleet/sdk";
import { Link, Stack } from "expo-router";
import { OwnerHeaderNotifications } from "../../../components/owner-header-notifications";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  Banner,
  ExpiryBadges,
  OpenOutCustodyCue,
  openOutCustodyA11y,
  PrimaryButton,
  PrimaryLink,
  SelectInput,
} from "../../../components/ui";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";

type SortMode = "default" | VehicleListSortField;

export default function VehiclesList() {
  const { offline, me } = useAuth();
  const [items, setItems] = useState<Vehicle[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [custody, setCustody] = useState<VehicleCustodyFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [sortDir, setSortDir] = useState<VehicleListSortDirection>("asc");

  const isCompany = me?.account_kind === "company";

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

  const effectiveCustody: VehicleCustodyFilter = isCompany ? custody : "all";

  const customSortFields = useMemo(
    () => (items ? collectVehicleListCustomSortFields(items) : []),
    [items],
  );

  const listSort = useMemo(() => {
    if (sortMode === "default") return "default" as const;
    return { field: sortMode, direction: sortDir };
  }, [sortMode, sortDir]);

  const visible = useMemo(() => {
    if (!items) return [];
    return projectVehiclesList(items, { custody: effectiveCustody, sort: listSort });
  }, [items, effectiveCustody, listSort]);

  const filterActive = isCompany && custody !== "all";
  const total = items?.length ?? 0;

  const sortByOptions = useMemo(
    () => [
      { value: "default", label: "Default order" },
      { value: "any", label: "Any expiration" },
      ...VEHICLE_LIST_SORT_BUILTIN_FIELDS.map((f) => ({
        value: f.field,
        label: f.label,
      })),
      ...customSortFields.map((f) => ({ value: f.field, label: f.label })),
    ],
    [customSortFields],
  );

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
        <>
          <View
            className="bg-surface-raised border-b border-divider px-1.5 py-1.5 gap-1.5"
            accessibilityLabel="Vehicles list filter and sort"
          >
            <Text className="text-caption text-text-secondary font-tabular">
              {filterActive
                ? `${visible.length} of ${total} vehicles`
                : `${total} vehicles`}
            </Text>
            {isCompany ? (
              <SelectInput
                label="Custody"
                value={custody}
                placeholder="All"
                options={[
                  { value: "all", label: "All" },
                  { value: "out", label: "Out" },
                  { value: "in", label: "In" },
                ]}
                onChange={(v) => setCustody(v as VehicleCustodyFilter)}
              />
            ) : null}
            <SelectInput
              label="Sort by"
              value={sortMode}
              placeholder="Default order"
              options={sortByOptions}
              onChange={(v) => setSortMode(v as SortMode)}
            />
            {sortMode !== "default" ? (
              <SelectInput
                label="Order"
                value={sortDir}
                placeholder="Soonest first"
                options={[
                  { value: "asc", label: "Soonest first" },
                  { value: "desc", label: "Furthest first" },
                ]}
                onChange={(v) => setSortDir(v as VehicleListSortDirection)}
              />
            ) : null}
          </View>
          {visible.length === 0 ? (
            <View className="gap-1 py-2">
              <Text className="text-section font-semibold text-text-primary">
                No vehicles match.
              </Text>
              <Text className="text-body text-text-primary">
                Try a different custody filter or sort.
              </Text>
            </View>
          ) : (
            visible.map((v) => (
              <Link key={v.id} href={`/(owner)/vehicles/${v.id}`} asChild>
                <Pressable
                  className="bg-surface-raised border border-border rounded-md p-2 min-h-hit gap-1"
                  accessibilityLabel={[
                    warningA11y(
                      `${vehicleLabel(v)}, ${v.license_plate}${v.has_side_images ? ", has photos" : ""}`,
                      v.warnings,
                      v.custom_expirations,
                    ),
                    openOutCustodyA11y(v.open_out),
                  ]
                    .filter(Boolean)
                    .join(", ")}
                >
                  <View className="flex-row flex-wrap items-center gap-1">
                    <Text className="font-medium text-label text-text-primary">
                      {vehicleLabel(v)}
                      {v.has_side_images === true ? " · Photos" : ""}
                    </Text>
                    <OpenOutCustodyCue openOut={v.open_out} />
                  </View>
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
        </>
      )}
    </ScrollView>
  );
}
