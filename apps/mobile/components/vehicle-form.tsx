import {
  FleetApiError,
  odometerUnitForCountry,
  odometerUnitLabel,
  WARNING_FIELD_LABEL,
  type Vehicle,
  type VehicleSide,
  type VehicleWrite,
  type WarningField,
} from "@fleet/sdk";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

type VehicleFormTab = "details" | "images" | "handovers";
import { ConfirmDeleteDialog, TrashIcon } from "./confirm-delete-dialog";
import { VehicleHandoversTab } from "./vehicle-handovers-tab";
import { VehicleSideImageViewer } from "./vehicle-side-image-viewer";
import { Field, PrimaryButton, SecondaryButton, TextInput } from "./ui";
import { api } from "../lib/api";
import { prepareVehicleSideImageForUpload } from "../lib/prepare-side-image";
import { sideImageLog } from "../lib/side-image-log";

const DATE_FIELDS: WarningField[] = [
  "insurance_on",
  "inspection_on",
  "road_tax_on",
  "registration_on",
];

/** Local constants — avoid relying on SDK runtime exports in the client bundle. */
const VEHICLE_SIDES: VehicleSide[] = ["FRONT", "LEFT", "RIGHT", "BACK"];
const VEHICLE_SIDE_LABEL: Record<VehicleSide, string> = {
  FRONT: "Front",
  LEFT: "Left",
  RIGHT: "Right",
  BACK: "Back",
};

function dateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match?.[1] ?? "";
}

function emptySideErrors(): Record<VehicleSide, string | null> {
  return { FRONT: null, LEFT: null, RIGHT: null, BACK: null };
}

function normalizeVehicle(v: Vehicle): Vehicle {
  const side_images = v.side_images ?? {
    FRONT: null,
    LEFT: null,
    RIGHT: null,
    BACK: null,
  };
  return {
    ...v,
    side_images,
    has_side_images:
      typeof v.has_side_images === "boolean"
        ? v.has_side_images
        : VEHICLE_SIDES.some((side) => Boolean(side_images[side])),
  };
}

export function VehicleForm({
  initial,
  offline,
  submitLabel,
  onSubmit,
  onVehicleChange,
}: {
  initial?: Vehicle;
  offline: boolean;
  submitLabel: string;
  onSubmit: (body: VehicleWrite) => Promise<Vehicle | void>;
  onVehicleChange?: (vehicle: Vehicle) => void;
}) {
  const [make, setMake] = useState(initial?.make ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [plate, setPlate] = useState(initial?.license_plate ?? "");
  const [country, setCountry] = useState(initial?.country_of_registration ?? "");
  const [mileage, setMileage] = useState(
    initial?.mileage != null && Number.isFinite(initial.mileage) ? String(initial.mileage) : "",
  );
  const [dates, setDates] = useState<Record<WarningField, string>>({
    insurance_on: dateInputValue(initial?.insurance_on),
    inspection_on: dateInputValue(initial?.inspection_on),
    road_tax_on: dateInputValue(initial?.road_tax_on),
    registration_on: dateInputValue(initial?.registration_on),
  });
  const [vehicle, setVehicle] = useState<Vehicle | undefined>(
    initial ? normalizeVehicle(initial) : undefined,
  );
  const [busy, setBusy] = useState(false);
  const [sideBusy, setSideBusy] = useState<VehicleSide | null>(null);
  const [sideErrors, setSideErrors] =
    useState<Record<VehicleSide, string | null>>(emptySideErrors());
  const [clearConfirmSide, setClearConfirmSide] = useState<VehicleSide | null>(null);
  const [viewerSide, setViewerSide] = useState<VehicleSide | null>(null);
  const [tab, setTab] = useState<VehicleFormTab>("details");

  function applyVehicle(next: Vehicle) {
    const normalized = normalizeVehicle(next);
    setVehicle(normalized);
    onVehicleChange?.(normalized);
  }

  async function pickAndUpload(side: VehicleSide) {
    if (!vehicle?.id) {
      sideImageLog.warn("upload:skipped-no-vehicle-id", { side });
      return;
    }
    sideImageLog.info("upload:start", {
      side,
      vehicleId: vehicle.id,
      apiBase: sideImageLog.apiBase(),
      offline,
    });
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    sideImageLog.info("upload:permission", {
      granted: permission.granted,
      status: permission.status,
      accessPrivileges:
        "accessPrivileges" in permission ? permission.accessPrivileges : undefined,
    });
    if (!permission.granted) {
      sideImageLog.error("upload:permission-denied", { side });
      setSideErrors((prev) => ({ ...prev, [side]: "Photo library permission is required." }));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) {
      sideImageLog.info("upload:picker-canceled", { side, canceled: result.canceled });
      return;
    }
    const asset = result.assets[0];
    sideImageLog.info("upload:asset", {
      side,
      uriScheme: asset.uri?.split(":")[0] ?? null,
      fileName: asset.fileName ?? null,
      mimeType: asset.mimeType ?? null,
      fileSize: asset.fileSize ?? null,
      width: asset.width ?? null,
      height: asset.height ?? null,
    });
    setSideBusy(side);
    setSideErrors((prev) => ({ ...prev, [side]: null }));
    try {
      const prepared = await prepareVehicleSideImageForUpload(
        {
          uri: asset.uri,
          fileName: asset.fileName,
          mimeType: asset.mimeType,
          fileSize: asset.fileSize,
          width: asset.width,
          height: asset.height,
        },
        side.toLowerCase(),
      );
      if (!prepared.ok) {
        sideImageLog.error("upload:prepare-rejected", {
          side,
          message: prepared.message,
        });
        setSideErrors((prev) => ({ ...prev, [side]: prepared.message }));
        return;
      }
      sideImageLog.info("upload:put-start", {
        side,
        vehicleId: vehicle.id,
        filename: prepared.filename,
        kind: "bytes-file",
        hasBytes: typeof prepared.file.bytes === "function",
        mime: prepared.file.type ?? null,
        size: prepared.file.size ?? null,
        apiBase: sideImageLog.apiBase(),
      });
      const next = await api.putVehicleSideImage(
        vehicle.id,
        side,
        prepared.file,
        prepared.filename,
      );
      sideImageLog.info("upload:put-ok", {
        side,
        vehicleId: next.id,
        hasSideImages: next.has_side_images,
        sideFilled: Boolean(next.side_images?.[side]?.url),
      });
      applyVehicle(next);
    } catch (err) {
      const message =
        err instanceof FleetApiError
          ? err.code === "validation_error"
            ? err.message
            : err.code === "storage_unavailable"
              ? "Could not store photo. Try again."
              : err.message
          : "Could not upload photo.";
      sideImageLog.error("upload:put-failed", {
        side,
        apiBase: sideImageLog.apiBase(),
        uiMessage: message,
        code: err instanceof FleetApiError ? err.code : null,
        status: err instanceof FleetApiError ? err.status : null,
        apiMessage: err instanceof FleetApiError ? err.message : null,
        error:
          err instanceof Error
            ? { name: err.name, message: err.message }
            : { message: String(err) },
      });
      setSideErrors((prev) => ({ ...prev, [side]: message }));
    } finally {
      setSideBusy(null);
      sideImageLog.info("upload:done", { side });
    }
  }

  async function clearSideConfirmed() {
    const side = clearConfirmSide;
    if (!vehicle?.id || !side) return;
    setSideBusy(side);
    setSideErrors((prev) => ({ ...prev, [side]: null }));
    try {
      const next = await api.clearVehicleSideImage(vehicle.id, side);
      applyVehicle(next);
      setClearConfirmSide(null);
    } catch (err) {
      const message =
        err instanceof FleetApiError
          ? err.code === "storage_unavailable"
            ? "Could not clear photo. Try again."
            : err.message
          : "Could not clear photo.";
      setSideErrors((prev) => ({ ...prev, [side]: message }));
      setClearConfirmSide(null);
    } finally {
      setSideBusy(null);
    }
  }

  return (
    <View className="gap-2">
      <View className="flex-row border-b border-divider" accessibilityRole="tablist">
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === "details" }}
          onPress={() => setTab("details")}
          className={`min-h-hit px-2 items-center justify-center border-b-2 ${
            tab === "details" ? "border-brand" : "border-transparent"
          }`}
        >
          <Text
            className={`text-label ${
              tab === "details" ? "font-semibold text-text-primary" : "font-medium text-text-secondary"
            }`}
          >
            Details
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === "images" }}
          onPress={() => setTab("images")}
          className={`min-h-hit px-2 items-center justify-center border-b-2 ${
            tab === "images" ? "border-brand" : "border-transparent"
          }`}
        >
          <Text
            className={`text-label ${
              tab === "images" ? "font-semibold text-text-primary" : "font-medium text-text-secondary"
            }`}
          >
            Images
          </Text>
        </Pressable>
        {vehicle?.id ? (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === "handovers" }}
            onPress={() => setTab("handovers")}
            className={`min-h-hit px-2 items-center justify-center border-b-2 ${
              tab === "handovers" ? "border-brand" : "border-transparent"
            }`}
          >
            <Text
              className={`text-label ${
                tab === "handovers"
                  ? "font-semibold text-text-primary"
                  : "font-medium text-text-secondary"
              }`}
            >
              Handovers
            </Text>
          </Pressable>
        ) : null}
      </View>

      {tab === "details" ? (
        <View className="gap-2 pt-2">
          <Field label="Make">
            <TextInput value={make} onChangeText={setMake} />
          </Field>
          <Field label="Model">
            <TextInput value={model} onChangeText={setModel} />
          </Field>
          <Field label="License plate">
            <TextInput value={plate} onChangeText={setPlate} autoCapitalize="characters" />
          </Field>
          <Field label="Country of registration">
            <TextInput value={country} onChangeText={setCountry} />
          </Field>
          {(() => {
            const unitLabel = odometerUnitLabel(odometerUnitForCountry(country || null));
            return (
              <Field label={unitLabel} hint={unitLabel}>
                <TextInput
                  value={mileage}
                  onChangeText={setMileage}
                  keyboardType="decimal-pad"
                  accessibilityLabel={unitLabel}
                  placeholder="Optional"
                />
              </Field>
            );
          })()}
          {DATE_FIELDS.map((field) => {
            const warning = vehicle?.warnings.find((w) => w.field === field);
            return (
              <Field key={field} label={WARNING_FIELD_LABEL[field]}>
                <TextInput
                  value={dates[field]}
                  onChangeText={(v) => setDates((d) => ({ ...d, [field]: v }))}
                  placeholder="YYYY-MM-DD"
                />
                {warning ? (
                  <Text
                    className={
                      warning.state === "expired" ? "text-danger text-caption" : "text-warning text-caption"
                    }
                  >
                    {warning.state === "expired" ? "Expired" : "Due soon"}
                  </Text>
                ) : null}
              </Field>
            );
          })}
        </View>
      ) : null}

      {tab === "images" ? (
        <View className="gap-2 pt-2">
          <Text className="text-caption text-text-secondary">
            Optional photos from four sides. Any image type up to 5 MB.
          </Text>
          {!vehicle?.id ? (
            <Text className="text-caption text-text-secondary">Save the vehicle first to add photos.</Text>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {VEHICLE_SIDES.map((side) => {
                const image = vehicle.side_images?.[side] ?? null;
                const error = sideErrors[side];
                const uploading = sideBusy === side;
                const label = VEHICLE_SIDE_LABEL[side];
                const filled = Boolean(image?.url) && !uploading;
                return (
                  <View key={side} className="w-[47%] gap-1 min-w-0">
                    <Text className="text-label text-text-primary">{label}</Text>
                    {filled && image?.url ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`View ${label} photo`}
                        disabled={clearConfirmSide !== null}
                        onPress={() => {
                          if (sideBusy === side || clearConfirmSide !== null) return;
                          setViewerSide(side);
                        }}
                        className={`h-vehicle-side-slot w-full rounded-md border overflow-hidden bg-surface-sunken items-center justify-center min-h-hit ${
                          error ? "border-danger" : "border-border"
                        }`}
                      >
                        <Image source={{ uri: image.url }} className="h-full w-full" resizeMode="cover" />
                      </Pressable>
                    ) : (
                      <View
                        className={`h-vehicle-side-slot w-full rounded-md border overflow-hidden bg-surface-sunken items-center justify-center ${
                          error ? "border-danger" : "border-border"
                        }`}
                        accessibilityLabel={`${label} photo`}
                      >
                        {uploading ? (
                          <View className="h-full w-full bg-disabled-surface" />
                        ) : (
                          <Text className="text-caption text-text-secondary p-1">No photo</Text>
                        )}
                      </View>
                    )}
                    <SecondaryButton
                      title={image ? "Replace photo" : "Add photo"}
                      disabled={busy || uploading || offline}
                      onPress={() => void pickAndUpload(side)}
                    />
                    {image ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Clear ${label} photo`}
                        disabled={busy || uploading || offline || clearConfirmSide !== null}
                        onPress={() => {
                          setViewerSide(null);
                          setSideErrors((prev) => ({ ...prev, [side]: null }));
                          setClearConfirmSide(side);
                        }}
                        className={`h-hit w-hit flex items-center justify-center rounded-md p-0 ${
                          busy || uploading || offline ? "opacity-50" : ""
                        }`}
                      >
                        <TrashIcon />
                      </Pressable>
                    ) : null}
                    {error ? <Text className="text-danger text-caption">{error}</Text> : null}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      ) : null}

      {tab === "handovers" && vehicle?.id ? (
        <VehicleHandoversTab vehicleId={vehicle.id} offline={offline} />
      ) : null}

      <VehicleSideImageViewer
        open={viewerSide !== null && Boolean(vehicle?.side_images?.[viewerSide]?.url)}
        sideLabel={viewerSide ? VEHICLE_SIDE_LABEL[viewerSide] : ""}
        imageUrl={viewerSide ? (vehicle?.side_images?.[viewerSide]?.url ?? "") : ""}
        onClose={() => setViewerSide(null)}
      />

      <ConfirmDeleteDialog
        open={clearConfirmSide !== null}
        title={
          clearConfirmSide
            ? `Clear ${VEHICLE_SIDE_LABEL[clearConfirmSide]} photo?`
            : "Clear photo?"
        }
        body="This removes the photo from the vehicle. You can add a new one later."
        confirmLabel="Clear photo"
        confirmBusyLabel="Clearing…"
        busy={clearConfirmSide !== null && sideBusy === clearConfirmSide}
        disabledConfirm={offline}
        onCancel={() => {
          if (!(clearConfirmSide !== null && sideBusy === clearConfirmSide)) {
            setClearConfirmSide(null);
          }
        }}
        onConfirm={() => void clearSideConfirmed()}
      />

      {tab !== "handovers" ? (
        <PrimaryButton
          title={submitLabel}
          busy={busy || Boolean(sideBusy)}
          disabled={offline}
          onPress={() => {
            void (async () => {
              setBusy(true);
              try {
                const next = await onSubmit({
                  make: make.trim(),
                  model: model.trim(),
                  license_plate: plate.trim(),
                  country_of_registration: country || null,
                  mileage: mileage.trim() === "" ? null : mileage.trim(),
                  insurance_on: dates.insurance_on || null,
                  inspection_on: dates.inspection_on || null,
                  road_tax_on: dates.road_tax_on || null,
                  registration_on: dates.registration_on || null,
                });
                if (next) applyVehicle(next);
              } finally {
                setBusy(false);
              }
            })();
          }}
        />
      ) : null}
    </View>
  );
}
