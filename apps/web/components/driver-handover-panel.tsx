"use client";

import {
  FleetApiError,
  odometerUnitLabel,
  type DriverTravel,
  type HandoverActive,
  type HandoverType,
  type OdometerUnit,
  type SideImageUploadFile,
} from "@fleet/sdk";
import { FormEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { Banner, Field, PrimaryButton, SecondaryButton, Skeleton, TextInput } from "./ui";
import { VehicleSideImageViewer } from "./vehicle-side-image-viewer";
import { themeClasses } from "../../../design/tailwind.theme";
import { api } from "../lib/api";
import { prepareVehicleSideImageForUpload } from "../lib/prepare-side-image";

const MAX_DAMAGE_PHOTOS = 10;

type PendingDamage = {
  id: string;
  previewUrl: string;
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
  /** Called after successful Out/In so parent can refresh vehicles/travel mileage. */
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
  const fileRef = useRef<HTMLInputElement | null>(null);
  const liveId = useId();

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

  useEffect(() => {
    return () => {
      for (const p of pending) URL.revokeObjectURL(p.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke only on unmount
  }, []);

  function resetFields() {
    setMileage("");
    setNextServiceDays("");
    setNextServiceDistance("");
    setDamagesText("");
    setFieldErrors({});
    setFormError(null);
    setAttachError(null);
    setPending((prev) => {
      for (const p of prev) URL.revokeObjectURL(p.previewUrl);
      return [];
    });
  }

  if (!hasTravel) return null;

  const loading = active === undefined && !loadError;
  const openOnThisVehicle =
    active != null && travelVehicleId != null && active.vehicle_id === travelVehicleId;
  const mode: HandoverType = openOnThisVehicle ? "in" : "out";
  const panelTitle = mode === "out" ? "Handover Out" : "Handover In";
  const submitLabel = mode === "out" ? "Submit Handover Out" : "Submit Handover In";

  const unit: OdometerUnit =
    active?.mileage_unit ??
    travel?.odometer_unit ??
    "km";
  const unitLabel = odometerUnitLabel(unit);
  const unitA11y = unitLabel.toLowerCase();

  const vehicleCaption =
    travel?.vehicle != null
      ? `${travel.vehicle.label} · ${travel.vehicle.license_plate}`
      : active?.vehicle != null
        ? `${active.vehicle.label} · ${active.vehicle.license_plate}`
        : "Active next-travel vehicle";

  const minMileageHint =
    mode === "in" && openOnThisVehicle
      ? active!.mileage
      : undefined;

  async function onAddFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setAttachError(null);
    const room = MAX_DAMAGE_PHOTOS - pending.length;
    if (room <= 0) {
      setAttachError("Maximum 10 photos.");
      return;
    }
    const files = Array.from(fileList).slice(0, room);
    setPreparing(true);
    try {
      for (const file of files) {
        if (!file.type.startsWith("image/") && file.type !== "") {
          setAttachError("Upload an image file.");
          continue;
        }
        const prepared = await prepareVehicleSideImageForUpload(file, "damage");
        if (!prepared.ok) {
          setAttachError(prepared.message);
          continue;
        }
        const previewUrl = URL.createObjectURL(
          prepared.file instanceof Blob ? prepared.file : file,
        );
        const id =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `d-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setPending((prev) => {
          if (prev.length >= MAX_DAMAGE_PHOTOS) {
            URL.revokeObjectURL(previewUrl);
            return prev;
          }
          return [
            ...prev,
            {
              id,
              previewUrl,
              file: prepared.file,
              filename: prepared.filename,
            },
          ];
        });
      }
    } finally {
      setPreparing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removePending(id: string) {
    setPending((prev) => {
      const next = prev.filter((p) => p.id !== id);
      const removed = prev.find((p) => p.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
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
        } else if (err.code === "validation_error") {
          setFormError(err.message);
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
    <section className={themeClasses.panel} aria-label={panelTitle}>
      {loadError ? (
        <div className="flex flex-col gap-2">
          <Banner tone="danger">{loadError}</Banner>
          <SecondaryButton type="button" onClick={() => void loadActive()}>
            Retry
          </SecondaryButton>
        </div>
      ) : loading ? (
        <div className="flex flex-col gap-1" aria-busy="true">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-28" />
        </div>
      ) : (
        <form className="flex flex-col gap-2" onSubmit={(e) => void onSubmit(e)}>
          {openOnThisVehicle ? (
            <Banner tone="warning">
              <span className="inline-flex flex-wrap items-center gap-1">
                <span className={themeClasses.badgeNeutral}>Out open</span>
                <span>Out open — complete Handover In when you return the vehicle.</span>
              </span>
            </Banner>
          ) : null}
          {openOnThisVehicle && active ? (
            <p className={themeClasses.caption}>
              Open Out recorded {formatWhen(active.created_at)}
              {active.mileage != null
                ? ` · ${active.mileage} ${active.mileage_unit}`
                : ""}
            </p>
          ) : null}

          <h2 className={themeClasses.sectionTitle}>{panelTitle}</h2>
          <p className={themeClasses.caption}>{vehicleCaption}</p>
          <p className={themeClasses.caption}>Units: {unitLabel}</p>

          {successMsg ? (
            <p id={liveId} className={themeClasses.caption} role="status" aria-live="polite">
              {successMsg}
            </p>
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
              inputMode="decimal"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              disabled={inert}
              error={Boolean(fieldErrors.mileage)}
              required
              aria-label={`${unitLabel} (handover)`}
              aria-required="true"
            />
          </Field>
          <Field label="Next service (days)" error={fieldErrors.next_service_days}>
            <TextInput
              inputMode="numeric"
              value={nextServiceDays}
              onChange={(e) => setNextServiceDays(e.target.value)}
              disabled={inert}
              error={Boolean(fieldErrors.next_service_days)}
              required
              aria-label="Next service in days"
              aria-required="true"
            />
          </Field>
          <Field
            label={`Next service (${unitLabel})`}
            error={fieldErrors.next_service_distance}
          >
            <TextInput
              inputMode="decimal"
              value={nextServiceDistance}
              onChange={(e) => setNextServiceDistance(e.target.value)}
              disabled={inert}
              error={Boolean(fieldErrors.next_service_distance)}
              required
              aria-label={`Next service distance in ${unitA11y}`}
              aria-required="true"
            />
          </Field>
          <Field label="Damages (optional)">
            <textarea
              className={`${themeClasses.input} w-full min-h-[5rem] focus:border-focus outline-none`}
              value={damagesText}
              onChange={(e) => setDamagesText(e.target.value)}
              disabled={inert}
              aria-label="Damages, optional"
              rows={3}
            />
          </Field>

          <div className="flex flex-col gap-1">
            <span className={themeClasses.label}>Damage photos</span>
            <p className={themeClasses.caption}>
              Up to 10 images · image types only · max 5 MB each
            </p>
            <div
              className={themeClasses.handoverDamageGrid}
              role="group"
              aria-label={`Damage photos, optional, ${pending.length} of 10`}
            >
              {pending.map((p, index) => (
                <div key={p.id} className={`${themeClasses.handoverDamageThumb} relative`}>
                  <button
                    type="button"
                    className={`h-full w-full p-0 border-0 ${themeClasses.handoverDamageThumbFocus}`}
                    onClick={() => setViewerIndex(index)}
                    aria-label={`Damage photo ${index + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.previewUrl}
                      alt=""
                      className="h-full w-full object-cover pointer-events-none"
                    />
                  </button>
                  <button
                    type="button"
                    className={`${themeClasses.buttonIcon} ${themeClasses.handoverDamageThumbRemove} bg-surface-raised border border-border text-text-primary hover:bg-hover`}
                    aria-label={`Remove damage photo ${index + 1}`}
                    disabled={inert}
                    onClick={() => removePending(p.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
              {preparing ? <div className={`${themeClasses.skeleton} h-6 w-6`} /> : null}
            </div>
            {atMaxPhotos ? (
              <p className={themeClasses.caption}>Maximum 10 photos.</p>
            ) : null}
            {attachError ? (
              <p className={themeClasses.errorText} role="alert">
                {attachError}
              </p>
            ) : null}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              aria-label="Add damage photos"
              disabled={inert || atMaxPhotos}
              onChange={(e) => void onAddFiles(e.target.files)}
            />
            <SecondaryButton
              type="button"
              disabled={inert || atMaxPhotos}
              onClick={() => fileRef.current?.click()}
            >
              Add photos
            </SecondaryButton>
          </div>

          <PrimaryButton type="submit" busy={busy} disabled={inert}>
            {busy ? "Submitting…" : submitLabel}
          </PrimaryButton>
        </form>
      )}

      <VehicleSideImageViewer
        open={viewerIndex != null && pending[viewerIndex] != null}
        sideLabel="Damage"
        imageUrl={viewerIndex != null ? (pending[viewerIndex]?.previewUrl ?? "") : ""}
        title={
          viewerIndex != null
            ? `Damage photo ${viewerIndex + 1} of ${pending.length}`
            : undefined
        }
        onClose={() => setViewerIndex(null)}
      />
    </section>
  );
}
