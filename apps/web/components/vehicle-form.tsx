"use client";

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
import { FormEvent, useCallback, useId, useRef, useState } from "react";
import { ConfirmDeleteDialog, TrashIcon } from "./confirm-delete-dialog";
import { VehicleHandoversTab } from "./vehicle-handovers-tab";
import { VehicleSideImageViewer } from "./vehicle-side-image-viewer";
import { Field, PrimaryButton, SecondaryButton, TextInput } from "./ui";
import { themeClasses } from "../../../design/tailwind.theme";
import { api } from "../lib/api";
import { prepareVehicleSideImageForUpload } from "../lib/prepare-side-image";

const DATE_FIELDS: WarningField[] = [
  "insurance_on",
  "inspection_on",
  "road_tax_on",
  "registration_on",
];

type VehicleFormTab = "details" | "images" | "handovers";

/** Local constants — avoid relying on SDK runtime exports in the client bundle. */
const VEHICLE_SIDES: VehicleSide[] = ["FRONT", "LEFT", "RIGHT", "BACK"];
const VEHICLE_SIDE_LABEL: Record<VehicleSide, string> = {
  FRONT: "Front",
  LEFT: "Left",
  RIGHT: "Right",
  BACK: "Back",
};

/** `input type="date"` needs YYYY-MM-DD; tolerate ISO timestamps from API. */
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
  const fileRefs = useRef<Partial<Record<VehicleSide, HTMLInputElement | null>>>({});
  const clearTriggerRefs = useRef<Partial<Record<VehicleSide, HTMLButtonElement | null>>>({});
  const viewTriggerRefs = useRef<Partial<Record<VehicleSide, HTMLButtonElement | null>>>({});
  const detailsTabId = useId();
  const imagesTabId = useId();
  const handoversTabId = useId();
  const detailsPanelId = useId();
  const imagesPanelId = useId();
  const handoversPanelId = useId();

  function applyVehicle(next: Vehicle) {
    const normalized = normalizeVehicle(next);
    setVehicle(normalized);
    onVehicleChange?.(normalized);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
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
  }

  async function uploadSide(side: VehicleSide, file: File) {
    if (!vehicle?.id) return;
    setSideBusy(side);
    setSideErrors((prev) => ({ ...prev, [side]: null }));
    try {
      const prepared = await prepareVehicleSideImageForUpload(file, side.toLowerCase());
      if (!prepared.ok) {
        setSideErrors((prev) => ({ ...prev, [side]: prepared.message }));
        return;
      }
      const next = await api.putVehicleSideImage(
        vehicle.id,
        side,
        prepared.file,
        prepared.filename,
      );
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
      setSideErrors((prev) => ({ ...prev, [side]: message }));
    } finally {
      setSideBusy(null);
    }
  }

  const closeClearConfirm = useCallback(() => {
    const side = clearConfirmSide;
    setClearConfirmSide(null);
    if (side) {
      queueMicrotask(() => clearTriggerRefs.current[side]?.focus());
    }
  }, [clearConfirmSide]);

  const closeViewer = useCallback(() => {
    const side = viewerSide;
    setViewerSide(null);
    if (side) {
      queueMicrotask(() => viewTriggerRefs.current[side]?.focus());
    }
  }, [viewerSide]);

  function openViewer(side: VehicleSide) {
    if (sideBusy === side || clearConfirmSide !== null) return;
    setViewerSide(side);
  }

  function openClearConfirm(side: VehicleSide) {
    setViewerSide(null);
    setSideErrors((prev) => ({ ...prev, [side]: null }));
    setClearConfirmSide(side);
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
      queueMicrotask(() => clearTriggerRefs.current[side]?.focus());
    } finally {
      setSideBusy(null);
    }
  }

  return (
    <form className={themeClasses.vehicleForm} onSubmit={submit}>
      <div className={themeClasses.vehicleFormTabList} role="tablist" aria-label="Vehicle sections">
        <button
          id={detailsTabId}
          type="button"
          role="tab"
          aria-selected={tab === "details"}
          aria-controls={detailsPanelId}
          tabIndex={tab === "details" ? 0 : -1}
          className={
            tab === "details" ? themeClasses.vehicleFormTabSelected : themeClasses.vehicleFormTab
          }
          onClick={() => setTab("details")}
        >
          Details
        </button>
        <button
          id={imagesTabId}
          type="button"
          role="tab"
          aria-selected={tab === "images"}
          aria-controls={imagesPanelId}
          tabIndex={tab === "images" ? 0 : -1}
          className={
            tab === "images" ? themeClasses.vehicleFormTabSelected : themeClasses.vehicleFormTab
          }
          onClick={() => setTab("images")}
        >
          Images
        </button>
        {vehicle?.id ? (
          <button
            id={handoversTabId}
            type="button"
            role="tab"
            aria-selected={tab === "handovers"}
            aria-controls={handoversPanelId}
            tabIndex={tab === "handovers" ? 0 : -1}
            className={
              tab === "handovers"
                ? themeClasses.vehicleFormTabSelected
                : themeClasses.vehicleFormTab
            }
            onClick={() => setTab("handovers")}
          >
            Handovers
          </button>
        ) : null}
      </div>

      {tab === "details" ? (
        <div
          id={detailsPanelId}
          role="tabpanel"
          aria-labelledby={detailsTabId}
          className={`${themeClasses.vehicleFormTabPanel} ${themeClasses.vehicleFormDetails}`}
        >
          <Field label="Make">
            <TextInput value={make} onChange={(e) => setMake(e.target.value)} required disabled={busy} />
          </Field>
          <Field label="Model">
            <TextInput value={model} onChange={(e) => setModel(e.target.value)} required disabled={busy} />
          </Field>
          <Field label="License plate">
            <TextInput value={plate} onChange={(e) => setPlate(e.target.value)} required disabled={busy} />
          </Field>
          <Field label="Country of registration">
            <TextInput value={country} onChange={(e) => setCountry(e.target.value)} disabled={busy} />
          </Field>
          {(() => {
            const unitLabel = odometerUnitLabel(odometerUnitForCountry(country || null));
            return (
              <Field label={unitLabel} hint={unitLabel}>
                <TextInput
                  type="text"
                  inputMode="decimal"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  disabled={busy}
                  aria-label={unitLabel}
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
                  type="date"
                  value={dates[field]}
                  onChange={(e) => setDates((d) => ({ ...d, [field]: e.target.value }))}
                  disabled={busy}
                />
                {warning ? (
                  <span
                    className={
                      warning.state === "expired" ? themeClasses.badgeExpired : themeClasses.badgeWarning
                    }
                  >
                    {warning.state === "expired" ? "Expired" : "Due soon"}
                  </span>
                ) : null}
              </Field>
            );
          })}
        </div>
      ) : null}

      {tab === "images" ? (
        <div
          id={imagesPanelId}
          role="tabpanel"
          aria-labelledby={imagesTabId}
          className={themeClasses.vehicleFormTabPanel}
        >
          <div className={themeClasses.vehicleSideSection}>
            <p className={themeClasses.caption}>
              Optional photos from four sides. Any image type up to 5 MB.
            </p>
            {!vehicle?.id ? (
              <p className={themeClasses.caption}>Save the vehicle first to add photos.</p>
            ) : (
              <div className={themeClasses.vehicleSideGrid}>
                {VEHICLE_SIDES.map((side) => {
                  const image = vehicle.side_images?.[side] ?? null;
                  const error = sideErrors[side];
                  const uploading = sideBusy === side;
                  const label = VEHICLE_SIDE_LABEL[side];
                  const filled = Boolean(image?.url) && !uploading;
                  return (
                    <div key={side} className={themeClasses.vehicleSideSlot}>
                      <span className={themeClasses.label}>{label}</span>
                      {filled && image?.url ? (
                        <button
                          ref={(el) => {
                            viewTriggerRefs.current[side] = el;
                          }}
                          type="button"
                          className={`${themeClasses.vehicleSideFrameFilled} ${
                            error ? themeClasses.vehicleSideFrameError : ""
                          } focus-visible:shadow-ring focus-visible:border-focus p-0`}
                          aria-label={`View ${label} photo`}
                          disabled={clearConfirmSide !== null}
                          onClick={() => openViewer(side)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={image.url}
                            alt=""
                            className={`${themeClasses.vehicleSidePreview} object-cover pointer-events-none`}
                          />
                        </button>
                      ) : (
                        <div
                          className={`${themeClasses.vehicleSideFrame} ${
                            error ? themeClasses.vehicleSideFrameError : ""
                          }`}
                          role="group"
                          aria-label={`${label} photo`}
                        >
                          {uploading ? (
                            <div className={`${themeClasses.skeleton} h-full w-full`} />
                          ) : (
                            <span className={`${themeClasses.caption} p-1`}>No photo</span>
                          )}
                        </div>
                      )}
                      <div className={themeClasses.vehicleSideActions}>
                        <input
                          ref={(el) => {
                            fileRefs.current[side] = el;
                          }}
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          aria-label={image ? `Replace ${label} photo` : `Add ${label} photo`}
                          disabled={busy || uploading || offline}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (file) void uploadSide(side, file);
                          }}
                        />
                        <SecondaryButton
                          type="button"
                          disabled={busy || uploading || offline}
                          onClick={() => fileRefs.current[side]?.click()}
                        >
                          {image ? "Replace photo" : "Add photo"}
                        </SecondaryButton>
                        {image ? (
                          <button
                            ref={(el) => {
                              clearTriggerRefs.current[side] = el;
                            }}
                            type="button"
                            className={`${themeClasses.buttonIcon} text-danger hover:bg-hover focus-visible:shadow-ring disabled:text-disabled`}
                            disabled={busy || uploading || offline || clearConfirmSide !== null}
                            aria-label={`Clear ${label} photo`}
                            onClick={() => openClearConfirm(side)}
                          >
                            <TrashIcon className="block h-nav-icon w-nav-icon shrink-0" />
                          </button>
                        ) : null}
                      </div>
                      {error ? (
                        <span className={themeClasses.errorText} role="alert">
                          {error}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {tab === "handovers" && vehicle?.id ? (
        <div
          id={handoversPanelId}
          role="tabpanel"
          aria-labelledby={handoversTabId}
          className={themeClasses.vehicleFormTabPanel}
        >
          <VehicleHandoversTab vehicleId={vehicle.id} offline={offline} />
        </div>
      ) : null}

      {tab !== "handovers" ? (
        <div className={themeClasses.vehicleFormDetails}>
          <PrimaryButton type="submit" busy={busy || Boolean(sideBusy)} disabled={offline}>
            {submitLabel}
          </PrimaryButton>
        </div>
      ) : null}

      <VehicleSideImageViewer
        open={viewerSide !== null && Boolean(vehicle?.side_images?.[viewerSide]?.url)}
        sideLabel={viewerSide ? VEHICLE_SIDE_LABEL[viewerSide] : ""}
        imageUrl={viewerSide ? (vehicle?.side_images?.[viewerSide]?.url ?? "") : ""}
        onClose={closeViewer}
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
        onCancel={closeClearConfirm}
        onConfirm={() => void clearSideConfirmed()}
      />
    </form>
  );
}
