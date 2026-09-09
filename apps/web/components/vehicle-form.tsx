"use client";

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
import { FormEvent, useCallback, useId, useMemo, useRef, useState } from "react";
import { ConfirmDeleteDialog, TrashIcon } from "./confirm-delete-dialog";
import { VehicleHandoversTab } from "./vehicle-handovers-tab";
import { VehicleSideImageViewer } from "./vehicle-side-image-viewer";
import { Field, PrimaryButton, SecondaryButton, SelectInput, TextInput } from "./ui";
import { themeClasses } from "../../../design/tailwind.theme";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { prepareVehicleSideImageForUpload } from "../lib/prepare-side-image";

const DATE_FIELDS: BuiltInWarningField[] = [
  "insurance_on",
  "inspection_on",
  "road_tax_on",
  "registration_on",
];

const CUSTOM_EXPIRATION_MAX = 10;
const CUSTOM_LABEL_MAX = 80;
const DATE_ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

type VehicleFormTab = "details" | "images" | "handovers";

type CustomExpirationDraft = {
  /** Server id when known; omitted on write for new rows. */
  id?: string;
  /** Stable React key (server id or client temp). Never sent as id unless server-owned. */
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

/** A1 preview for draft dates (same 30-day window as server warnings). */
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
  const fileRefs = useRef<Partial<Record<VehicleSide, HTMLInputElement | null>>>({});
  const clearTriggerRefs = useRef<Partial<Record<VehicleSide, HTMLButtonElement | null>>>({});
  const viewTriggerRefs = useRef<Partial<Record<VehicleSide, HTMLButtonElement | null>>>({});
  const customRemoveTriggerRefs = useRef<Partial<Record<string, HTMLButtonElement | null>>>({});
  const customLabelInputRefs = useRef<Partial<Record<string, HTMLInputElement | null>>>({});
  const detailsTabId = useId();
  const imagesTabId = useId();
  const handoversTabId = useId();
  const detailsPanelId = useId();
  const imagesPanelId = useId();
  const handoversPanelId = useId();

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

  function openRemoveCustom(key: string) {
    setRemoveCustomKey(key);
  }

  function closeRemoveCustom() {
    const key = removeCustomKey;
    setRemoveCustomKey(null);
    if (key) {
      queueMicrotask(() => customRemoveTriggerRefs.current[key]?.focus());
    }
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

  async function submit(e: FormEvent) {
    e.preventDefault();
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
        {companyTenant ? (
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
        ) : null}
        {companyTenant && vehicle?.id ? (
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
            <SelectInput
              value={makeSelect}
              required
              disabled={busy}
              aria-label="Make"
              onChange={(e) => {
                const next = e.target.value;
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
            >
              <option value="">Select make</option>
              {catalogMakes.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              <option value={VEHICLE_CATALOG_OTHER}>{VEHICLE_CATALOG_OTHER}</option>
            </SelectInput>
          </Field>
          {makeSelect === VEHICLE_CATALOG_OTHER ? (
            <Field label="Make (custom)">
              <TextInput
                value={make}
                onChange={(e) => setMake(e.target.value)}
                required
                disabled={busy}
                aria-label="Custom make"
              />
            </Field>
          ) : null}
          <Field label="Model">
            <SelectInput
              value={modelSelect}
              required
              disabled={busy || !makeSelect}
              aria-label="Model"
              onChange={(e) => {
                const next = e.target.value;
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
            >
              <option value="">{makeSelect ? "Select model" : "Select make first"}</option>
              {catalogModels.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              {makeSelect ? <option value={VEHICLE_CATALOG_OTHER}>{VEHICLE_CATALOG_OTHER}</option> : null}
            </SelectInput>
          </Field>
          {modelSelect === VEHICLE_CATALOG_OTHER ? (
            <Field label="Model (custom)">
              <TextInput
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
                disabled={busy}
                aria-label="Custom model"
              />
            </Field>
          ) : null}
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
          <div className={themeClasses.vehicleCustomExpirations}>
            <h3 className={themeClasses.sectionTitle}>Custom expirations</h3>
            {customExpirations.length === 0 ? (
              <p className={themeClasses.caption}>No custom expirations yet.</p>
            ) : (
              <div className={themeClasses.vehicleCustomExpirationList}>
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
                    <div
                      key={row.key}
                      className={themeClasses.vehicleCustomExpirationRow}
                      role="group"
                      aria-label={
                        labelTrim ? `Custom expiration: ${labelTrim}` : "New custom expiration"
                      }
                    >
                      {/* Match Registration: title = object label, date control under it. */}
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <input
                            ref={(el) => {
                              customLabelInputRefs.current[row.key] = el;
                            }}
                            className={`${themeClasses.label} min-w-0 flex-1 border-0 bg-transparent p-0 outline-none focus-visible:shadow-ring ${
                              rowErrors.label ? "text-danger" : ""
                            }`}
                            value={row.label}
                            onChange={(e) =>
                              updateCustomExpiration(row.key, { label: e.target.value })
                            }
                            disabled={busy}
                            placeholder="e.g. Fire extinguisher"
                            aria-label={
                              labelTrim
                                ? `${labelTrim} label`
                                : `Custom expiration ${index + 1} label`
                            }
                            maxLength={CUSTOM_LABEL_MAX + 20}
                          />
                          <button
                            ref={(el) => {
                              customRemoveTriggerRefs.current[row.key] = el;
                            }}
                            type="button"
                            className={`${themeClasses.buttonIcon} text-danger hover:bg-hover focus-visible:shadow-ring disabled:text-disabled`}
                            disabled={busy || offline || removeCustomKey !== null}
                            aria-label={removeName}
                            onClick={() => openRemoveCustom(row.key)}
                          >
                            <TrashIcon className="block h-nav-icon w-nav-icon shrink-0" />
                          </button>
                        </div>
                        <TextInput
                          type="date"
                          value={row.expires_on}
                          onChange={(e) =>
                            updateCustomExpiration(row.key, { expires_on: e.target.value })
                          }
                          disabled={busy}
                          error={Boolean(rowErrors.expires_on)}
                          aria-label={dateA11y}
                        />
                        {previewState ? (
                          <span
                            className={
                              previewState === "expired"
                                ? themeClasses.badgeExpired
                                : themeClasses.badgeWarning
                            }
                          >
                            {previewState === "expired" ? "Expired" : "Due soon"}
                          </span>
                        ) : null}
                        {fieldError ? (
                          <span className={themeClasses.errorText} role="alert">
                            {fieldError}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <SecondaryButton
              type="button"
              disabled={
                busy || offline || customExpirations.length >= CUSTOM_EXPIRATION_MAX
              }
              onClick={addCustomExpiration}
            >
              Add expiration
            </SecondaryButton>
            {customExpirations.length >= CUSTOM_EXPIRATION_MAX ? (
              <p className={themeClasses.caption}>Maximum of 10 custom expirations.</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {companyTenant && tab === "images" ? (
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
        onCancel={closeRemoveCustom}
        onConfirm={confirmRemoveCustom}
      />
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

      {companyTenant && tab === "handovers" && vehicle?.id ? (
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
