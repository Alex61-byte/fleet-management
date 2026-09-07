import {
  FleetApiError,
  odometerUnitLabel,
  type DriverTravel,
  type HandoverActive,
  type HandoverType,
  type OdometerUnit,
  type SideImageUploadFile,
} from "@fleet/sdk";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, Text, TextInput as RNTextInput, View } from "react-native";
import { Banner, Field, PrimaryButton, SecondaryButton, TextInput } from "./ui";
import { VehicleSideImageViewer } from "./vehicle-side-image-viewer";
import { api } from "../lib/api";
import { prepareVehicleSideImageForUpload } from "../lib/prepare-side-image";

const MAX_DAMAGE_PHOTOS = 10;

type PendingDamage = {
  id: string;
  previewUri: string;
  file: SideImageUploadFile;
  filename: string;
};

type FieldErrors = {
  mileage?: string;
  next_service_days?: string;
  next_service_distance?: string;
};

function isOneDecimalNonNeg(raw: string): boolean {
  return /^\d+(\.\d)?$/.test(raw.trim());
}

function isWholeDays(raw: string): boolean {
  return /^[1-9]\d*$/.test(raw.trim());
}

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

export function DriverHandoverPanel({
  travel,
  offline,
  onHandoverSaved,
}: {
  travel: DriverTravel | null | undefined;
  offline: boolean;
  onHandoverSaved?: () => void | Promise<void>;
}) {
  const [active, setActive] = useState<HandoverActive | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [mileage, setMileage] = useState("");
  const [nextServiceDays, setNextServiceDays] = useState("");
  const [nextServiceDistance, setNextServiceDistance] = useState("");
  const [damagesText, setDamagesText] = useState("");
  const [pending, setPending] = useState<PendingDamage[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const hasTravel = Boolean(travel?.vehicle_id);
  const travelVehicleId = travel?.vehicle_id ?? null;

  const loadActive = useCallback(async () => {
    if (!hasTravel) {
      setActive(null);
      setLoadError(null);
      return;
    }
    setLoadError(null);
    try {
      const res = await api.getDriverActiveHandover();
      setActive(res.handover);
    } catch (err) {
      setActive(null);
      setLoadError(err instanceof FleetApiError ? err.message : "Could not load handover status.");
    }
  }, [hasTravel]);

  useEffect(() => {
    void loadActive();
  }, [loadActive, travelVehicleId]);

  function resetFields() {
    setMileage("");
    setNextServiceDays("");
    setNextServiceDistance("");
    setDamagesText("");
    setFieldErrors({});
    setFormError(null);
    setAttachError(null);
    setPending([]);
  }

  if (!hasTravel) return null;

  const loading = active === undefined && !loadError;
  const openOnThisVehicle =
    active != null && travelVehicleId != null && active.vehicle_id === travelVehicleId;
  const mode: HandoverType = openOnThisVehicle ? "in" : "out";
  const panelTitle = mode === "out" ? "Handover Out" : "Handover In";
  const submitLabel = mode === "out" ? "Submit Handover Out" : "Submit Handover In";

  const unit: OdometerUnit = active?.mileage_unit ?? travel?.odometer_unit ?? "km";
  const unitLabel = odometerUnitLabel(unit);
  const unitA11y = unitLabel.toLowerCase();

  const vehicleCaption =
    travel?.vehicle != null
      ? `${travel.vehicle.label} · ${travel.vehicle.license_plate}`
      : active?.vehicle != null
        ? `${active.vehicle.label} · ${active.vehicle.license_plate}`
        : "Active next-travel vehicle";

  const minMileageHint = mode === "in" && openOnThisVehicle ? active!.mileage : undefined;

  async function onAddPhotos() {
    setAttachError(null);
    if (pending.length >= MAX_DAMAGE_PHOTOS) {
      setAttachError("Maximum 10 photos.");
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setAttachError("Photo library permission is required.");
      return;
    }
    const room = MAX_DAMAGE_PHOTOS - pending.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: room,
    });
    if (result.canceled || !result.assets.length) return;

    setPreparing(true);
    try {
      for (const asset of result.assets) {
        if (pending.length >= MAX_DAMAGE_PHOTOS) break;
        const prepared = await prepareVehicleSideImageForUpload(
          {
            uri: asset.uri,
            fileName: asset.fileName,
            mimeType: asset.mimeType,
            fileSize: asset.fileSize,
            width: asset.width,
            height: asset.height,
          },
          "damage",
        );
        if (!prepared.ok) {
          setAttachError(prepared.message);
          continue;
        }
        const id = `d-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setPending((prev) => {
          if (prev.length >= MAX_DAMAGE_PHOTOS) return prev;
          return [
            ...prev,
            {
              id,
              previewUri: asset.uri,
              file: prepared.file,
              filename: prepared.filename,
            },
          ];
        });
      }
    } finally {
      setPreparing(false);
    }
  }

  function removePending(id: string) {
    setPending((prev) => prev.filter((p) => p.id !== id));
  }

  function validate(): boolean {
    const next: FieldErrors = {};
    const m = mileage.trim();
    const d = nextServiceDays.trim();
    const dist = nextServiceDistance.trim();
    if (!m) next.mileage = "Enter a non-negative number with at most one decimal";
    else if (!isOneDecimalNonNeg(m))
      next.mileage = "Enter a non-negative number with at most one decimal";
    if (!d) next.next_service_days = "Enter a whole number of 1 or more";
    else if (!isWholeDays(d)) next.next_service_days = "Enter a whole number of 1 or more";
    if (!dist) next.next_service_distance = "Enter a non-negative number with at most one decimal";
    else if (!isOneDecimalNonNeg(dist))
      next.next_service_distance = "Enter a non-negative number with at most one decimal";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit() {
    setFormError(null);
    setSuccessMsg(null);
    if (!validate()) return;
    setBusy(true);
    try {
      await api.createDriverHandover({
        type: mode,
        mileage: mileage.trim(),
        next_service_days: nextServiceDays.trim(),
        next_service_distance: nextServiceDistance.trim(),
        damages_text: damagesText.trim() || undefined,
        damages: pending.map((p) => p.file),
      });
      resetFields();
      setSuccessMsg(mode === "out" ? "Handover Out saved." : "Handover In saved.");
      await loadActive();
      await onHandoverSaved?.();
    } catch (err) {
      if (err instanceof FleetApiError) {
        if (err.code === "storage_unavailable") {
          setFormError("Handover could not be saved. Try again.");
        } else {
          setFormError(err.message);
        }
      } else {
        setFormError("Handover could not be saved. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  const inert = offline || busy || preparing;
  const atMaxPhotos = pending.length >= MAX_DAMAGE_PHOTOS;

  return (
    <View
      className="bg-surface-raised rounded-lg p-2 gap-2 border border-divider"
      accessibilityLabel={panelTitle}
    >
      {loadError ? (
        <>
          <Banner tone="danger">{loadError}</Banner>
          <SecondaryButton title="Retry" onPress={() => void loadActive()} />
        </>
      ) : loading ? (
        <Text className="text-caption text-text-secondary">Loading handover…</Text>
      ) : (
        <View className="gap-2">
          {openOnThisVehicle ? (
            <Banner tone="warning">
              Out open — complete Handover In when you return the vehicle.
            </Banner>
          ) : null}
          {openOnThisVehicle && active ? (
            <Text className="text-caption text-text-secondary">
              Open Out recorded {formatWhen(active.created_at)}
              {active.mileage != null ? ` · ${active.mileage} ${active.mileage_unit}` : ""}
            </Text>
          ) : null}

          <Text className="font-semibold text-body text-text-primary">{panelTitle}</Text>
          <Text className="text-caption text-text-secondary">{vehicleCaption}</Text>
          <Text className="text-caption text-text-secondary">Units: {unitLabel}</Text>

          {successMsg ? (
            <Text className="text-caption text-text-secondary" accessibilityLiveRegion="polite">
              {successMsg}
            </Text>
          ) : null}
          {formError ? <Banner tone="danger">{formError}</Banner> : null}

          <Field
            label={unitLabel}
            error={fieldErrors.mileage}
            hint={
              minMileageHint != null
                ? `Must be at least ${minMileageHint} ${unit}`
                : undefined
            }
          >
            <TextInput
              value={mileage}
              onChangeText={setMileage}
              keyboardType="decimal-pad"
              editable={!inert}
              error={Boolean(fieldErrors.mileage)}
              accessibilityLabel={`${unitLabel} (handover)`}
            />
          </Field>
          <Field label="Next service (days)" error={fieldErrors.next_service_days}>
            <TextInput
              value={nextServiceDays}
              onChangeText={setNextServiceDays}
              keyboardType="number-pad"
              editable={!inert}
              error={Boolean(fieldErrors.next_service_days)}
              accessibilityLabel="Next service in days"
            />
          </Field>
          <Field
            label={`Next service (${unitLabel})`}
            error={fieldErrors.next_service_distance}
          >
            <TextInput
              value={nextServiceDistance}
              onChangeText={setNextServiceDistance}
              keyboardType="decimal-pad"
              editable={!inert}
              error={Boolean(fieldErrors.next_service_distance)}
              accessibilityLabel={`Next service distance in ${unitA11y}`}
            />
          </Field>
          <Field label="Damages (optional)">
            <RNTextInput
              className="min-h-[5rem] px-2 py-2 rounded-md bg-surface border border-border text-body text-text-primary"
              value={damagesText}
              onChangeText={setDamagesText}
              editable={!inert}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Damages, optional"
              placeholderTextColor="#4b5968"
            />
          </Field>

          <View className="gap-1">
            <Text className="font-medium text-label text-text-primary">Damage photos</Text>
            <Text className="text-caption text-text-secondary">
              Up to 10 images · image types only · max 5 MB each
            </Text>
            <View
              className="flex-row flex-wrap gap-1 items-start"
              accessibilityLabel={`Damage photos, optional, ${pending.length} of 10`}
            >
              {pending.map((p, index) => (
                <View key={p.id} className="relative h-6 w-6">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Damage photo ${index + 1}`}
                    onPress={() => setViewerIndex(index)}
                    className="h-6 w-6 rounded-md overflow-hidden bg-surface-sunken border border-border"
                  >
                    <Image source={{ uri: p.previewUri }} className="h-full w-full" resizeMode="cover" />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove damage photo ${index + 1}`}
                    disabled={inert}
                    onPress={() => removePending(p.id)}
                    className="absolute -top-1 -right-1 h-hit w-hit items-center justify-center"
                    hitSlop={4}
                  >
                    <Text className="text-body text-text-primary">×</Text>
                  </Pressable>
                </View>
              ))}
              {preparing ? <View className="h-6 w-6 rounded-md bg-disabled-surface" /> : null}
            </View>
            {atMaxPhotos ? (
              <Text className="text-caption text-text-secondary">Maximum 10 photos.</Text>
            ) : null}
            {attachError ? (
              <Text className="text-danger text-caption" accessibilityRole="alert">
                {attachError}
              </Text>
            ) : null}
            <SecondaryButton
              title="Add photos"
              disabled={inert || atMaxPhotos}
              onPress={() => void onAddPhotos()}
            />
          </View>

          <PrimaryButton
            title={busy ? "Submitting…" : submitLabel}
            onPress={() => void onSubmit()}
            disabled={inert}
            busy={busy}
          />
        </View>
      )}

      <VehicleSideImageViewer
        open={viewerIndex != null && pending[viewerIndex] != null}
        sideLabel="Damage"
        imageUrl={viewerIndex != null ? (pending[viewerIndex]?.previewUri ?? "") : ""}
        title={
          viewerIndex != null
            ? `Damage photo ${viewerIndex + 1} of ${pending.length}`
            : undefined
        }
        onClose={() => setViewerIndex(null)}
      />
    </View>
  );
}
