import {
  FleetApiError,
  VEHICLE_CATALOG_OTHER,
  daysUntilUtc,
  odometerUnitForCountry,
  odometerUnitLabel,
  utcToday,
  vehicleCatalogMakes,
  vehicleCatalogModelsForMake,
  vehicleMakeSelectValue,
  vehicleModelSelectValue,
  WARNING_FIELD_LABEL,
  type BuiltInWarningField,
  type Vehicle,
  type VehicleSide,
  type VehicleWrite,
  type WarningState,
} from "@fleet/sdk";
import * as ImagePicker from "expo-image-picker";
import { useMemo, useRef, useState } from "react";
import { Image, Pressable, Text, TextInput as RNTextInput, View } from "react-native";

type VehicleFormTab = "details" | "images" | "handovers";
import { ConfirmDeleteDialog, TrashIcon } from "./confirm-delete-dialog";
import { VehicleHandoversTab } from "./vehicle-handovers-tab";
import { VehicleSideImageViewer } from "./vehicle-side-image-viewer";
import { Field, PrimaryButton, SecondaryButton, SelectInput, TextInput } from "./ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { prepareVehicleSideImageForUpload } from "../lib/prepare-side-image";
import { sideImageLog } from "../lib/side-image-log";

const DATE_FIELDS: BuiltInWarningField[] = [
  "insurance_on",
  "inspection_on",
  "road_tax_on",
  "registration_on",
];

const CUSTOM_EXPIRATION_MAX = 10;
const CUSTOM_LABEL_MAX = 80;
const DATE_ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

type CustomExpirationDraft = {
  id?: string;
  key: string;
  label: string;
  expires_on: string;
  serverOwned: boolean;
};

type CustomExpirationFieldErrors = {
  label?: string;
  expires_on?: string;
};

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
    custom_expirations: v.custom_expirations ?? [],
    side_images,
    has_side_images:
      typeof v.has_side_images === "boolean"
        ? v.has_side_images
        : VEHICLE_SIDES.some((side) => Boolean(side_images[side])),
  };
}

function draftsFromVehicle(v: Vehicle | undefined): CustomExpirationDraft[] {
  return (v?.custom_expirations ?? []).map((row) => ({
    id: row.id,
    key: row.id,
    label: row.label,
    expires_on: dateInputValue(row.expires_on),
    serverOwned: true,
  }));
}

function newCustomDraft(): CustomExpirationDraft {
  const key =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `tmp-${crypto.randomUUID()}`
      : `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return { key, label: "", expires_on: "", serverOwned: false };
}

function a1StateForDate(expiresOn: string, todayIso = utcToday()): WarningState | null {
  const value = dateInputValue(expiresOn);
  if (!DATE_ISO_RE.test(value)) return null;
  const days = daysUntilUtc(value, todayIso);
  if (days < 0) return "expired";
  if (days <= 30) return "due_soon";
  return null;
}

function validateCustomExpirations(
  drafts: CustomExpirationDraft[],
): Record<string, CustomExpirationFieldErrors> {
  const errors: Record<string, CustomExpirationFieldErrors> = {};
  const seen = new Map<string, string>();

  for (const row of drafts) {
    const rowErrors: CustomExpirationFieldErrors = {};
    const trimmed = row.label.trim();

    if (!trimmed) {
      rowErrors.label = "Enter a label (1–80 characters).";
    } else if (trimmed.length > CUSTOM_LABEL_MAX) {
      rowErrors.label = "Label must be 80 characters or fewer.";
    } else {
      const key = trimmed.toLowerCase();
      const prior = seen.get(key);
      if (prior) {
        rowErrors.label = "Label must be unique on this vehicle.";
        const priorErrors = errors[prior] ?? {};
        if (!priorErrors.label) {
          errors[prior] = { ...priorErrors, label: "Label must be unique on this vehicle." };
        }
      } else {
        seen.set(key, row.key);
      }
    }

    const date = dateInputValue(row.expires_on);
    if (!date || !DATE_ISO_RE.test(date)) {
      rowErrors.expires_on = "Choose an expiration date.";
    }

    if (rowErrors.label || rowErrors.expires_on) {
      errors[row.key] = { ...errors[row.key], ...rowErrors };
    }
  }

  return errors;
}

function customExpirationsWritePayload(
  drafts: CustomExpirationDraft[],
): NonNullable<VehicleWrite["custom_expirations"]> {
  return drafts.map((row) => {
    const item: { id?: string; label: string; expires_on: string } = {
      label: row.label.trim(),
      expires_on: dateInputValue(row.expires_on),
    };
    if (row.serverOwned && row.id) item.id = row.id;
    return item;
  });
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
  const { me } = useAuth();
  const companyTenant = me?.account_kind !== "individual";
  const [make, setMake] = useState(initial?.make ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [makeSelect, setMakeSelect] = useState(() => vehicleMakeSelectValue(initial?.make));
  const [modelSelect, setModelSelect] = useState(() =>
    vehicleModelSelectValue(initial?.make, initial?.model),
  );
  const [plate, setPlate] = useState(initial?.license_plate ?? "");
  const [country, setCountry] = useState(initial?.country_of_registration ?? "");
  const [mileage, setMileage] = useState(
    initial?.mileage != null && Number.isFinite(initial.mileage) ? String(initial.mileage) : "",
  );
  const catalogMakes = useMemo(() => vehicleCatalogMakes(), []);
  const catalogModels = useMemo(
    () => (makeSelect && makeSelect !== VEHICLE_CATALOG_OTHER ? vehicleCatalogModelsForMake(makeSelect) : []),
    [makeSelect],
  );
  const makeOptions = useMemo(
    () => [
      { value: "", label: "Select make" },
      ...catalogMakes.map((name) => ({ value: name, label: name })),
      { value: VEHICLE_CATALOG_OTHER, label: VEHICLE_CATALOG_OTHER },
    ],
    [catalogMakes],
  );
  const modelOptions = useMemo(
    () => [
      { value: "", label: makeSelect ? "Select model" : "Select make first" },
      ...catalogModels.map((name) => ({ value: name, label: name })),
      ...(makeSelect ? [{ value: VEHICLE_CATALOG_OTHER, label: VEHICLE_CATALOG_OTHER }] : []),
    ],
    [catalogModels, makeSelect],
  );
  const [dates, setDates] = useState<Record<BuiltInWarningField, string>>({
    insurance_on: dateInputValue(initial?.insurance_on),
    inspection_on: dateInputValue(initial?.inspection_on),
    road_tax_on: dateInputValue(initial?.road_tax_on),
    registration_on: dateInputValue(initial?.registration_on),
  });
  const [customExpirations, setCustomExpirations] = useState<CustomExpirationDraft[]>(() =>
    draftsFromVehicle(initial),
  );
  const [customErrors, setCustomErrors] = useState<Record<string, CustomExpirationFieldErrors>>({});
  const [removeCustomKey, setRemoveCustomKey] = useState<string | null>(null);
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
  const customLabelInputRefs = useRef<Partial<Record<string, RNTextInput | null>>>({});

  const removeCustomTarget = useMemo(
    () => customExpirations.find((row) => row.key === removeCustomKey) ?? null,
    [customExpirations, removeCustomKey],
  );

  function applyVehicle(next: Vehicle) {
    const normalized = normalizeVehicle(next);
    setVehicle(normalized);
    setCustomExpirations(draftsFromVehicle(normalized));
    setCustomErrors({});
    onVehicleChange?.(normalized);
  }

  function addCustomExpiration() {
    if (customExpirations.length >= CUSTOM_EXPIRATION_MAX || offline || busy) return;
    const draft = newCustomDraft();
    setCustomExpirations((rows) => [...rows, draft]);
    queueMicrotask(() => customLabelInputRefs.current[draft.key]?.focus());
  }

  function updateCustomExpiration(
    key: string,
    patch: Partial<Pick<CustomExpirationDraft, "label" | "expires_on">>,
  ) {
    setCustomExpirations((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    setCustomErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      const rowErr = { ...next[key] };
      if (patch.label !== undefined) delete rowErr.label;
      if (patch.expires_on !== undefined) delete rowErr.expires_on;
      if (!rowErr.label && !rowErr.expires_on) delete next[key];
      else next[key] = rowErr;
      return next;
    });
  }

  function confirmRemoveCustom() {
    const key = removeCustomKey;
    if (!key) return;
    setCustomExpirations((rows) => rows.filter((row) => row.key !== key));
    setCustomErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setRemoveCustomKey(null);
  }

  async function submitDetails() {
    const fieldErrors = validateCustomExpirations(customExpirations);
    if (Object.keys(fieldErrors).length > 0) {
      setCustomErrors(fieldErrors);
      setTab("details");
      return;
    }
    setCustomErrors({});
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
        custom_expirations: customExpirationsWritePayload(customExpirations),
      });
      if (next) applyVehicle(next);
    } finally {
      setBusy(false);
    }
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
        {companyTenant ? (
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
        ) : null}
        {companyTenant && vehicle?.id ? (
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
            <SelectInput
              label="Make"
              value={makeSelect}
              placeholder="Select make"
              options={makeOptions}
              onChange={(next) => {
                setMakeSelect(next);
                if (!next) {
                  setMake("");
                  setModel("");
                  setModelSelect("");
                  return;
                }
                if (next === VEHICLE_CATALOG_OTHER) {
                  setMake("");
                  setModel("");
                  setModelSelect(VEHICLE_CATALOG_OTHER);
                  return;
                }
                setMake(next);
                setModel("");
                setModelSelect("");
              }}
            />
          </Field>
          {makeSelect === VEHICLE_CATALOG_OTHER ? (
            <Field label="Make (custom)">
              <TextInput value={make} onChangeText={setMake} accessibilityLabel="Custom make" />
            </Field>
          ) : null}
          <Field label="Model">
            <SelectInput
              label="Model"
              value={modelSelect}
              placeholder={makeSelect ? "Select model" : "Select make first"}
              options={modelOptions}
              disabled={!makeSelect}
              onChange={(next) => {
                setModelSelect(next);
                if (!next) {
                  setModel("");
                  return;
                }
                if (next === VEHICLE_CATALOG_OTHER) {
                  setModel("");
                  return;
                }
                setModel(next);
              }}
            />
          </Field>
          {modelSelect === VEHICLE_CATALOG_OTHER ? (
            <Field label="Model (custom)">
              <TextInput value={model} onChangeText={setModel} accessibilityLabel="Custom model" />
            </Field>
          ) : null}
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

          <View className="gap-2">
            <Text className="font-semibold text-section text-text-primary">Custom expirations</Text>
            {customExpirations.length === 0 ? (
              <Text className="text-caption text-text-secondary">No custom expirations yet.</Text>
            ) : (
              <View className="gap-2">
                {customExpirations.map((row, index) => {
                  const rowErrors = customErrors[row.key] ?? {};
                  const labelTrim = row.label.trim();
                  const serverWarning =
                    row.serverOwned && row.id
                      ? vehicle?.warnings.find((w) => w.field === `custom:${row.id}`)
                      : undefined;
                  const previewState =
                    serverWarning?.state ?? a1StateForDate(row.expires_on) ?? null;
                  const removeName = labelTrim
                    ? `Remove ${labelTrim} expiration`
                    : "Remove custom expiration";
                  const dateA11y = labelTrim
                    ? `${labelTrim} expiration date`
                    : `Custom expiration ${index + 1} date`;
                  const fieldError = rowErrors.expires_on ?? rowErrors.label;
                  return (
                    <View
                      key={row.key}
                      className="w-full gap-0.5"
                      accessibilityLabel={
                        labelTrim ? `Custom expiration: ${labelTrim}` : "New custom expiration"
                      }
                    >
                      {/* Match Registration: title = object label, date control under it. */}
                      <View className="flex-row items-center justify-between gap-1">
                        <TextInput
                          ref={(el) => {
                            customLabelInputRefs.current[row.key] = el;
                          }}
                          value={row.label}
                          onChangeText={(v) => updateCustomExpiration(row.key, { label: v })}
                          error={Boolean(rowErrors.label)}
                          placeholder="e.g. Fire extinguisher"
                          accessibilityLabel={
                            labelTrim
                              ? `${labelTrim} label`
                              : `Custom expiration ${index + 1} label`
                          }
                          maxLength={CUSTOM_LABEL_MAX + 20}
                          editable={!busy}
                          className="min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-label font-medium text-text-primary"
                        />
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={removeName}
                          disabled={busy || offline || removeCustomKey !== null}
                          onPress={() => setRemoveCustomKey(row.key)}
                          className={`h-hit w-hit flex items-center justify-center rounded-md p-0 ${
                            busy || offline ? "opacity-50" : ""
                          }`}
                        >
                          <TrashIcon />
                        </Pressable>
                      </View>
                      <TextInput
                        value={row.expires_on}
                        onChangeText={(v) => updateCustomExpiration(row.key, { expires_on: v })}
                        error={Boolean(rowErrors.expires_on)}
                        placeholder="YYYY-MM-DD"
                        accessibilityLabel={dateA11y}
                        editable={!busy}
                      />
                      {previewState ? (
                        <Text
                          className={
                            previewState === "expired"
                              ? "text-danger text-caption"
                              : "text-warning text-caption"
                          }
                        >
                          {previewState === "expired" ? "Expired" : "Due soon"}
                        </Text>
                      ) : null}
                      {fieldError ? (
                        <Text className="text-danger text-caption" accessibilityRole="alert">
                          {fieldError}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
            <SecondaryButton
              title="Add expiration"
              disabled={busy || offline || customExpirations.length >= CUSTOM_EXPIRATION_MAX}
              onPress={addCustomExpiration}
            />
            {customExpirations.length >= CUSTOM_EXPIRATION_MAX ? (
              <Text className="text-caption text-text-secondary">
                Maximum of 10 custom expirations.
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {companyTenant && tab === "images" ? (
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

      {companyTenant && tab === "handovers" && vehicle?.id ? (
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

      <ConfirmDeleteDialog
        open={removeCustomKey !== null}
        title={
          removeCustomTarget?.label.trim()
            ? `Remove ${removeCustomTarget.label.trim()}?`
            : "Remove custom expiration?"
        }
        body="This removes the custom expiration from the vehicle."
        caption="You can add it again later."
        confirmLabel="Remove"
        confirmBusyLabel="Removing…"
        disabledConfirm={offline}
        onCancel={() => setRemoveCustomKey(null)}
        onConfirm={confirmRemoveCustom}
      />

      {tab !== "handovers" ? (
        <PrimaryButton
          title={submitLabel}
          busy={busy || Boolean(sideBusy)}
          disabled={offline}
          onPress={() => {
            void submitDetails();
          }}
        />
      ) : null}
    </View>
  );
}
