export type Role = "owner" | "admin" | "driver";
export type Client = "web" | "mobile";
export type AccountKind = "company" | "individual";
export type WarningState = "expired" | "due_soon";
export type BuiltInWarningField =
  | "insurance_on"
  | "inspection_on"
  | "road_tax_on"
  | "registration_on";
/** API warnings: built-ins or `custom:<uuid>` (ADR-019). */
export type WarningField = BuiltInWarningField | `custom:${string}`;

export type VehicleCustomExpiration = {
  id: string;
  label: string;
  expires_on: string;
};

export type ApiErrorBody = { error: { code: string; message: string } };

export class FleetApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "FleetApiError";
  }
}

export type Principal = {
  id: string;
  email: string;
  role: Role;
  company_id: string;
  account_kind: AccountKind;
};

export type Me = Principal & {
  must_change_password: boolean;
  login_enabled: boolean;
  totp_enabled: boolean;
};

export type AuthSuccess = {
  status: "authenticated";
  principal: Principal;
  access_token: string;
  refresh_token: string;
  must_change_password: boolean;
};

export type TotpRequired = {
  status: "totp_required";
  challenge_token: string;
};

export type LoginResult = AuthSuccess | TotpRequired;

export type Driver = {
  id: string;
  email: string;
  must_change_password: boolean;
  login_enabled: boolean;
};

export type Warning = { field: WarningField; state: WarningState };

const BUILTIN_WARNING_FIELD_LABEL: Record<BuiltInWarningField, string> = {
  insurance_on: "Insurance",
  inspection_on: "Inspection",
  road_tax_on: "Road tax",
  registration_on: "Registration",
};

/** Built-in labels only; use `warningFieldLabel` for `custom:<id>`. */
export const WARNING_FIELD_LABEL: Record<BuiltInWarningField, string> =
  BUILTIN_WARNING_FIELD_LABEL;

export function isCustomWarningField(field: string): field is `custom:${string}` {
  return field.startsWith("custom:");
}

export function customExpirationIdFromWarningField(field: string): string | null {
  if (!isCustomWarningField(field)) return null;
  return field.slice("custom:".length) || null;
}

/** Resolve display label for a warning field (custom uses vehicle rows when provided). */
export function warningFieldLabel(
  field: string,
  customExpirations?: Iterable<Pick<VehicleCustomExpiration, "id" | "label">>,
): string {
  if (field in BUILTIN_WARNING_FIELD_LABEL) {
    return BUILTIN_WARNING_FIELD_LABEL[field as BuiltInWarningField];
  }
  const id = customExpirationIdFromWarningField(field);
  if (id && customExpirations) {
    for (const row of customExpirations) {
      if (row.id === id) return row.label;
    }
  }
  return id ? "Custom" : field;
}

export function warningA11y(
  plateOrCar: string,
  warnings: Warning[],
  customExpirations?: Iterable<Pick<VehicleCustomExpiration, "id" | "label">>,
): string {
  const parts = warnings.map(
    (w) =>
      `${warningFieldLabel(w.field, customExpirations).toLowerCase()} ${
        w.state === "expired" ? "expired" : "due soon"
      }`,
  );
  return parts.length ? `${plateOrCar}, ${parts.join(", ")}` : plateOrCar;
}

/** US-28 Vehicles nav/tab chrome — not list/detail `warnings` (30-day). */
export type VehiclesNavUrgency = "none" | "warning" | "critical";

/** Built-in section dates for US-28 nav urgency (registration_on excluded). */
export const VEHICLE_SECTION_FIELDS: BuiltInWarningField[] = [
  "insurance_on",
  "inspection_on",
  "road_tax_on",
];

/** UTC calendar date `YYYY-MM-DD` — matches API `utcToday`. */
export function utcToday(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Whole UTC calendar days from `todayIso` to `dateIso` (overdue ⇒ negative). */
export function daysUntilUtc(dateIso: string, todayIso = utcToday()): number {
  const [ty, tm, td] = todayIso.split("-").map(Number);
  const [dy, dm, dd] = dateIso.split("-").map(Number);
  const todayMs = Date.UTC(ty, tm - 1, td);
  const dateMs = Date.UTC(dy, dm - 1, dd);
  return Math.round((dateMs - todayMs) / 86_400_000);
}

type VehicleSectionDates = {
  insurance_on?: string | null;
  inspection_on?: string | null;
  road_tax_on?: string | null;
  registration_on?: string | null;
  /** Optional custom rows — each `expires_on` participates in US-89 nav urgency. */
  custom_expirations?: Iterable<Pick<VehicleCustomExpiration, "expires_on">> | null;
};

/**
 * Fleet-wide worst-wins nav urgency from section dates (ADR-004 / US-28 / US-89).
 * critical: any daysUntil &lt; 7 (incl. overdue); warning: else any daysUntil === 7; else none.
 * Includes custom expiration `expires_on`. Do not derive from `warnings` (30-day only).
 * `registration_on` never participates.
 */
export function vehiclesNavUrgency(
  vehicles: Iterable<VehicleSectionDates>,
  todayIso = utcToday(),
): VehiclesNavUrgency {
  let hasWarning = false;
  for (const vehicle of vehicles) {
    for (const field of VEHICLE_SECTION_FIELDS) {
      const value = vehicle[field];
      if (!value) continue;
      const days = daysUntilUtc(value, todayIso);
      if (days < 7) return "critical";
      if (days === 7) hasWarning = true;
    }
    for (const row of vehicle.custom_expirations ?? []) {
      const value = row.expires_on;
      if (!value) continue;
      const days = daysUntilUtc(value, todayIso);
      if (days < 7) return "critical";
      if (days === 7) hasWarning = true;
    }
  }
  return hasWarning ? "warning" : "none";
}

export function vehiclesNavA11yLabel(urgency: VehiclesNavUrgency): string {
  switch (urgency) {
    case "critical":
      return "Vehicles, critical expiry within 7 days";
    case "warning":
      return "Vehicles, expiry in 7 days";
    default:
      return "Vehicles";
  }
}

/** US-72 / US-89 compliance notification menu item (client-derived; ADR-017 / ADR-019). */
export type ComplianceNotificationField = Exclude<
  WarningField,
  "registration_on"
>;

export type ComplianceNotificationItem = {
  vehicle_id: string;
  make: string;
  model: string;
  license_plate: string;
  field: ComplianceNotificationField;
  /** Display label (built-in name or custom row label). */
  field_label: string;
  state: WarningState;
  date_on: string;
  days_until: number;
};

const NOTIFICATION_FIELD_ORDER: Record<string, number> = {
  insurance_on: 0,
  inspection_on: 1,
  road_tax_on: 2,
};

function notificationFieldOrder(field: string): number {
  if (field in NOTIFICATION_FIELD_ORDER) return NOTIFICATION_FIELD_ORDER[field]!;
  // Custom fields after built-ins; stable by field string.
  return 100;
}

export type ComplianceNotificationVehicle = {
  id: string;
  make: string;
  model: string;
  license_plate: string;
  insurance_on: string | null;
  inspection_on: string | null;
  road_tax_on: string | null;
  custom_expirations?: VehicleCustomExpiration[] | null;
  warnings: Warning[];
};

/**
 * Project OA Global Header notification rows from vehicles + server `warnings[]`.
 * Inclusion trusts API warnings (ADR-004 / ADR-019); does not re-apply the 30-day window.
 * Includes `custom:<uuid>` when present. Sort: days_until ascending; tie-break field order then plate. Cap 50 (rule 114).
 */
export function complianceNotificationItems(
  vehicles: Iterable<ComplianceNotificationVehicle>,
  todayIso = utcToday(),
  cap = 50,
): { items: ComplianceNotificationItem[]; truncated: boolean; total: number } {
  const items: ComplianceNotificationItem[] = [];
  for (const vehicle of vehicles) {
    const customs = vehicle.custom_expirations ?? [];
    const customById = new Map(customs.map((row) => [row.id, row]));
    for (const warning of vehicle.warnings) {
      if (warning.field === "registration_on") continue;
      let date_on: string | null | undefined;
      let field_label: string;
      if (isCustomWarningField(warning.field)) {
        const id = customExpirationIdFromWarningField(warning.field);
        const row = id ? customById.get(id) : undefined;
        if (!row?.expires_on) continue;
        date_on = row.expires_on;
        field_label = row.label;
      } else if (VEHICLE_SECTION_FIELDS.includes(warning.field as BuiltInWarningField)) {
        date_on = vehicle[warning.field as "insurance_on" | "inspection_on" | "road_tax_on"];
        field_label = warningFieldLabel(warning.field);
      } else {
        continue;
      }
      if (!date_on) continue;
      items.push({
        vehicle_id: vehicle.id,
        make: vehicle.make,
        model: vehicle.model,
        license_plate: vehicle.license_plate,
        field: warning.field as ComplianceNotificationField,
        field_label,
        state: warning.state,
        date_on,
        days_until: daysUntilUtc(date_on, todayIso),
      });
    }
  }
  items.sort((a, b) => {
    if (a.days_until !== b.days_until) return a.days_until - b.days_until;
    const fieldDelta =
      notificationFieldOrder(a.field) - notificationFieldOrder(b.field);
    if (fieldDelta !== 0) return fieldDelta;
    if (a.field !== b.field) return a.field.localeCompare(b.field);
    return a.license_plate.localeCompare(b.license_plate);
  });
  const total = items.length;
  return {
    items: items.slice(0, cap),
    truncated: total > cap,
    total,
  };
}

/** Accessible name for the Global Header notification control (US-70 / US-74). */
export function complianceNotificationsA11yLabel(count: number): string {
  if (count <= 0) return "Notifications";
  return `Notifications, ${count} compliance alerts`;
}

/** List/home identity: "Make Model" with single space. */
export function vehicleLabel(v: { make: string; model: string }): string {
  return `${v.make} ${v.model}`.replace(/\s+/g, " ").trim();
}

export {
  VEHICLE_CATALOG_OTHER,
  VEHICLE_MAKES_MODELS_CATALOG,
  vehicleCatalogMakes,
  vehicleCatalogModelsForMake,
  vehicleMakeSelectValue,
  vehicleModelSelectValue,
  type VehicleMakeModelsEntry,
  type VehicleMakesModelsCatalog,
} from "./vehicle-makes-models.js";

export function mapAuthError(code: string, fallback: string): string {
  switch (code) {
    case "invalid_credentials":
      return "Sign-in details are not correct.";
    case "validation_error":
      return "Check the email format and try again.";
    case "email_in_use":
      return "This email cannot be used.";
    case "password_too_short":
      return "At least 8 characters.";
    case "invite_invalid":
      return "This invitation is not valid.";
    case "email_not_invited":
      return "This email does not match the invitation.";
    case "invite_not_pending":
      return "This driver has already accepted their invitation.";
    case "totp_invalid":
      return "That code is not valid.";
    case "reset_invalid":
      return "This reset link is not valid. Request a new one.";
    case "login_disabled":
      return "Sign-in is disabled for this driver.";
    default:
      return fallback;
  }
}

export type VehicleSide = "FRONT" | "LEFT" | "RIGHT" | "BACK";

export const VEHICLE_SIDES: VehicleSide[] = ["FRONT", "LEFT", "RIGHT", "BACK"];

export const VEHICLE_SIDE_LABEL: Record<VehicleSide, string> = {
  FRONT: "Front",
  LEFT: "Left",
  RIGHT: "Right",
  BACK: "Back",
};

export type SideImage = { path: string; url: string };

/** Legacy RN `{ uri }` shape (classic XHR). Prefer {@link BytesImageFile} on Expo. */
export type LocalImageFile = {
  uri: string;
  name?: string;
  type?: string;
};

/**
 * Expo winter fetch FormData accepts string | Blob | objects with `bytes()`
 * (e.g. expo-file-system `File`). `{ uri }` parts throw Unsupported FormDataPart.
 */
export type BytesImageFile = {
  bytes: () => Promise<Uint8Array>;
  name?: string;
  type?: string;
  size?: number;
};

export type SideImageUploadFile = Blob | LocalImageFile | BytesImageFile;

const DEFAULT_SIDE_IMAGE_NAME = "photo.jpg";
const DEFAULT_SIDE_IMAGE_TYPE = "image/jpeg";

/**
 * Client mirror of API `MAX_VEHICLE_IMAGE_BYTES` (apps/api vehicle-image-storage).
 * Server remains source of truth (E36); clients use this to decide passthrough vs compress.
 */
export const MAX_VEHICLE_IMAGE_BYTES = 5 * 1024 * 1024;

/** Long-edge caps (px) tried in order when source exceeds MAX_VEHICLE_IMAGE_BYTES. */
export const SIDE_IMAGE_LONG_EDGES = [2048, 1600, 1280] as const;

/** JPEG quality ladder (0–1) tried per long-edge step. */
export const SIDE_IMAGE_JPEG_QUALITIES = [0.85, 0.75, 0.65, 0.55] as const;

export type SideImagePreparePlan =
  | { action: "passthrough" }
  | {
      action: "compress";
      longEdges: readonly number[];
      qualities: readonly number[];
    };

/** Decide whether to upload original or run client compress ladder. */
export function sideImagePreparePlan(byteLength: number): SideImagePreparePlan {
  if (!Number.isFinite(byteLength) || byteLength < 0) {
    return {
      action: "compress",
      longEdges: SIDE_IMAGE_LONG_EDGES,
      qualities: SIDE_IMAGE_JPEG_QUALITIES,
    };
  }
  if (byteLength <= MAX_VEHICLE_IMAGE_BYTES) return { action: "passthrough" };
  return {
    action: "compress",
    longEdges: SIDE_IMAGE_LONG_EDGES,
    qualities: SIDE_IMAGE_JPEG_QUALITIES,
  };
}

/** Scale so the longer side is at most `maxLongEdge` (aspect preserved). */
export function fitLongEdge(
  width: number,
  height: number,
  maxLongEdge: number,
): { width: number; height: number } {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const long = Math.max(w, h);
  if (long <= maxLongEdge) return { width: w, height: h };
  const scale = maxLongEdge / long;
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  };
}

/**
 * Walk geometry × quality ladder with a platform encoder.
 * Stops at first candidate with byteLength ≤ MAX_VEHICLE_IMAGE_BYTES.
 */
export async function runSideImageCompressLadder<T>(
  encode: (longEdge: number, quality: number) => Promise<{ byteLength: number; payload: T } | null>,
): Promise<{ ok: true; payload: T } | { ok: false; reason: "still_too_large" }> {
  for (const longEdge of SIDE_IMAGE_LONG_EDGES) {
    for (const quality of SIDE_IMAGE_JPEG_QUALITIES) {
      const candidate = await encode(longEdge, quality);
      if (!candidate) continue;
      if (candidate.byteLength > 0 && candidate.byteLength <= MAX_VEHICLE_IMAGE_BYTES) {
        return { ok: true, payload: candidate.payload };
      }
    }
  }
  return { ok: false, reason: "still_too_large" };
}

/** JPEG filename for compressed side uploads. */
export function jpegSideImageFilename(originalName?: string | null, sideHint?: string): string {
  const base =
    originalName?.trim().replace(/\.[^.]+$/, "") ||
    sideHint?.trim().toLowerCase() ||
    "photo";
  const safe = base.replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "") || "photo";
  return `${safe}.jpg`;
}

export const SIDE_IMAGE_STILL_TOO_LARGE_MESSAGE =
  "Image must be 5 MB or smaller. Try another photo.";

function isBytesImageFile(file: SideImageUploadFile): file is BytesImageFile {
  return (
    typeof file === "object" &&
    file !== null &&
    "bytes" in file &&
    typeof (file as BytesImageFile).bytes === "function"
  );
}

function isLocalImageFile(file: SideImageUploadFile): file is LocalImageFile {
  return (
    typeof file === "object" &&
    file !== null &&
    !isBytesImageFile(file) &&
    "uri" in file &&
    typeof (file as LocalImageFile).uri === "string" &&
    (file as LocalImageFile).uri.length > 0
  );
}

/**
 * Build multipart body for vehicle side upload (field name `file`).
 * Order matters for Expo winter fetch (convertFormDataAsync):
 * 1) Blob/File (web) — must win before bytes(): modern Blob also has bytes()
 * 2) objects with `bytes()` (expo-file-system File)
 * 3) legacy `{ uri, name, type }` (classic RN XHR only — Expo fetch rejects these)
 */
export function sideImageUploadFormData(
  file: SideImageUploadFile,
  filename = DEFAULT_SIDE_IMAGE_NAME,
): FormData {
  const form = new FormData();
  const safeName = filename.trim() || DEFAULT_SIDE_IMAGE_NAME;

  // Blob before bytes(): Node/Web Blob implements bytes() but needs the filename arg.
  if (typeof Blob !== "undefined" && file instanceof Blob) {
    form.append("file", file, safeName);
    return form;
  }

  if (isBytesImageFile(file)) {
    const name = (file.name?.trim() || safeName).trim() || DEFAULT_SIDE_IMAGE_NAME;
    const type = file.type?.trim() || DEFAULT_SIDE_IMAGE_TYPE;
    // Ensure content-disposition filename/type for native File-like objects.
    const part = file as BytesImageFile & { name?: string; type?: string };
    if (!part.name) {
      try {
        Object.defineProperty(part, "name", { value: name, configurable: true });
      } catch {
        /* native getters may be non-configurable */
      }
    }
    if (!part.type) {
      try {
        Object.defineProperty(part, "type", { value: type, configurable: true });
      } catch {
        /* ignore */
      }
    }
    form.append("file", part as unknown as Blob);
    return form;
  }

  if (isLocalImageFile(file)) {
    const name = (file.name?.trim() || safeName).trim() || DEFAULT_SIDE_IMAGE_NAME;
    const type = file.type?.trim() || DEFAULT_SIDE_IMAGE_TYPE;
    form.append("file", { uri: file.uri, name, type } as unknown as Blob);
    return form;
  }

  throw new Error("sideImageUploadFormData: expected Blob, BytesImageFile, or LocalImageFile");
}

/** Append one image part under `fieldName` (e.g. handover `damages`). */
export function appendImageFormPart(
  form: FormData,
  fieldName: string,
  file: SideImageUploadFile,
  filename = DEFAULT_SIDE_IMAGE_NAME,
): void {
  const safeName = filename.trim() || DEFAULT_SIDE_IMAGE_NAME;

  if (typeof Blob !== "undefined" && file instanceof Blob) {
    form.append(fieldName, file, safeName);
    return;
  }

  if (isBytesImageFile(file)) {
    const name = (file.name?.trim() || safeName).trim() || DEFAULT_SIDE_IMAGE_NAME;
    const type = file.type?.trim() || DEFAULT_SIDE_IMAGE_TYPE;
    const part = file as BytesImageFile & { name?: string; type?: string };
    if (!part.name) {
      try {
        Object.defineProperty(part, "name", { value: name, configurable: true });
      } catch {
        /* native getters may be non-configurable */
      }
    }
    if (!part.type) {
      try {
        Object.defineProperty(part, "type", { value: type, configurable: true });
      } catch {
        /* ignore */
      }
    }
    form.append(fieldName, part as unknown as Blob);
    return;
  }

  if (isLocalImageFile(file)) {
    const name = (file.name?.trim() || safeName).trim() || DEFAULT_SIDE_IMAGE_NAME;
    const type = file.type?.trim() || DEFAULT_SIDE_IMAGE_TYPE;
    form.append(fieldName, { uri: file.uri, name, type } as unknown as Blob);
    return;
  }

  throw new Error("appendImageFormPart: expected Blob, BytesImageFile, or LocalImageFile");
}

export type OdometerUnit = "mi" | "km";

/** Miles jurisdictions (A34 / ADR-012). Empty/unknown → km. */
const MILES_COUNTRY_KEYS = new Set(
  [
    "us",
    "usa",
    "united states",
    "united states of america",
    "gb",
    "uk",
    "united kingdom",
    "great britain",
    "lr",
    "liberia",
    "mm",
    "myanmar",
    "burma",
  ].map((s) => s),
);

export function normalizeCountryKey(country: string | null | undefined): string {
  return (country ?? "").trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
}

export function odometerUnitForCountry(country: string | null | undefined): OdometerUnit {
  const key = normalizeCountryKey(country);
  if (!key) return "km";
  if (MILES_COUNTRY_KEYS.has(key)) return "mi";
  return "km";
}

export type Vehicle = {
  id: string;
  company_id: string;
  make: string;
  model: string;
  license_plate: string;
  country_of_registration: string | null;
  /** Optional current odometer reading on the vehicle; null = unknown. */
  mileage: number | null;
  /** Read-only; derived from country_of_registration (A34). */
  mileage_unit: OdometerUnit;
  insurance_on: string | null;
  inspection_on: string | null;
  road_tax_on: string | null;
  registration_on: string | null;
  /** Always present on API reads (min `[]`). */
  custom_expirations: VehicleCustomExpiration[];
  warnings: Warning[];
  has_side_images: boolean;
  side_images: Record<VehicleSide, SideImage | null>;
};

export type VehicleWrite = {
  make?: string;
  model?: string;
  license_plate?: string;
  country_of_registration?: string | null;
  /** Omit to leave unchanged on PATCH; null or "" clears. */
  mileage?: number | string | null;
  insurance_on?: string | null;
  inspection_on?: string | null;
  road_tax_on?: string | null;
  registration_on?: string | null;
  /** When present: full replace. Omit on PATCH = unchanged. `[]` clears. */
  custom_expirations?: Array<{
    id?: string | null;
    label: string;
    expires_on: string;
  }>;
};

export type Home = {
  driver_count: number;
  vehicle_count: number;
  expiring_vehicles: {
    id: string;
    make: string;
    model: string;
    license_plate: string;
    warnings: Warning[];
  }[];
};

export type DriverVehicle = {
  id: string;
  make: string;
  model: string;
  license_plate: string;
  country_of_registration: string | null;
  mileage: number | null;
  mileage_unit: OdometerUnit;
  odometer_unit: OdometerUnit;
  label: string;
};

export type DriverTravel = {
  id: string;
  vehicle_id: string;
  odometer: number;
  odometer_unit: OdometerUnit;
  created_at: string;
  vehicle: {
    id: string;
    make: string;
    model: string;
    license_plate: string;
    label: string;
  } | null;
};

export type HandoverType = "out" | "in";
export type HandoverStatus = "open" | "closed" | "voided";

export type HandoverDriverRef = { id: string; email: string } | null;

export type HandoverVehicleSummary = {
  id: string;
  make: string;
  model: string;
  license_plate: string;
  label: string;
};

export type HandoverDamageImage = {
  id: string;
  path: string;
  url: string;
  sort_order: number;
};

export type HandoverListItem = {
  id: string;
  vehicle_id: string;
  company_id: string;
  type: HandoverType;
  status: HandoverStatus;
  handover_out_id: string | null;
  driver: HandoverDriverRef;
  mileage: number;
  mileage_unit: OdometerUnit;
  next_service_days: number;
  next_service_distance: number;
  next_service_distance_unit: OdometerUnit;
  damages_text: string | null;
  damage_image_count: number;
  created_at: string;
  closed_at: string | null;
  voided_at: string | null;
};

export type HandoverDetail = HandoverListItem & {
  damage_images: HandoverDamageImage[];
  vehicle: HandoverVehicleSummary | null;
  paired_out: {
    id: string;
    mileage: number;
    mileage_unit: OdometerUnit;
    created_at: string;
  } | null;
};

export type HandoverActive = {
  id: string;
  type: "out";
  status: "open";
  vehicle_id: string;
  mileage: number;
  mileage_unit: OdometerUnit;
  created_at: string;
  vehicle: HandoverVehicleSummary | null;
};

export type CreateHandoverInput = {
  type: HandoverType;
  mileage: number | string;
  next_service_days: number | string;
  next_service_distance: number | string;
  damages_text?: string;
  /** Optional damage photos (0–10). Field name `damages`. */
  damages?: SideImageUploadFile[];
};

export type DailyUsageVehicleSummary = {
  id: string;
  make: string;
  model: string;
  license_plate: string;
  label: string;
};

export type DailyUsage = {
  id: string;
  vehicle_id: string;
  usage_date: string;
  start_place: string;
  start_distance: number;
  end_place: string;
  end_distance: number;
  distance_unit: OdometerUnit;
  start_time: string;
  end_time: string;
  created_at: string;
  vehicle: DailyUsageVehicleSummary | null;
};

export type CreateDailyUsageInput = {
  usage_date: string;
  start_place: string;
  start_distance: number | string;
  start_time: string;
  end_place: string;
  end_distance: number | string;
  end_time: string;
};

export function odometerUnitLabel(unit: OdometerUnit): string {
  return unit === "mi" ? "Miles" : "Kilometers";
}

/** Format vehicle mileage for list/detail; empty string when unknown. */
export function formatVehicleMileage(
  mileage: number | null | undefined,
  unit: OdometerUnit | null | undefined,
): string {
  if (mileage == null || !Number.isFinite(mileage)) return "";
  const u = unit ?? "km";
  return `${mileage} ${u}`;
}

export type TokenStore = {
  getAccess(): string | null;
  getRefresh(): string | null;
  setTokens(access: string, refresh: string): void;
  clear(): void;
};

async function readError(res: Response): Promise<FleetApiError> {
  try {
    const body = (await res.json()) as ApiErrorBody;
    return new FleetApiError(res.status, body.error.code, body.error.message);
  } catch {
    return new FleetApiError(res.status, "internal_error", "Unexpected error.");
  }
}

export class FleetClient {
  /** Single-flight refresh promise (US-29). */
  private refreshInFlight: Promise<boolean> | null = null;
  /** Fired when a stored refresh fails (session ended); not on explicit logout. */
  private sessionInvalidHandler: (() => void) | null = null;

  constructor(
    private readonly baseUrl: string,
    private readonly tokens: TokenStore,
  ) {}

  /**
   * Register UI handler for forced session end (clear `me`, route to sign-in).
   * Called after refresh failure clears tokens (US-29).
   */
  setOnSessionInvalid(handler: (() => void) | null): void {
    this.sessionInvalidHandler = handler;
  }

  private notifySessionInvalid(): void {
    this.sessionInvalidHandler?.();
  }

  /**
   * Exchange stored refresh for a new token pair.
   * @returns true if tokens were updated; false if no refresh or refresh failed (tokens cleared).
   */
  async tryRefresh(): Promise<boolean> {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = this.runRefresh().finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  private async runRefresh(): Promise<boolean> {
    const refresh = this.tokens.getRefresh();
    if (!refresh) {
      this.tokens.clear();
      return false;
    }
    try {
      const pair = await this.request<{ access_token: string; refresh_token: string }>(
        "POST",
        "/v1/auth/refresh",
        { body: { refresh_token: refresh }, auth: false, _skipRefresh: true },
      );
      this.tokens.setTokens(pair.access_token, pair.refresh_token);
      return true;
    } catch {
      this.tokens.clear();
      this.notifySessionInvalid();
      return false;
    }
  }

  private async request<T>(
    method: string,
    path: string,
    opts?: {
      body?: unknown;
      formData?: FormData;
      auth?: boolean;
      empty?: boolean;
      _skipRefresh?: boolean;
      _retried?: boolean;
    },
  ): Promise<T> {
    const headers: Record<string, string> = { accept: "application/json" };
    if (opts?.body !== undefined && !opts.formData) headers["content-type"] = "application/json";
    if (opts?.auth !== false) {
      const access = this.tokens.getAccess();
      if (access) headers.authorization = `Bearer ${access}`;
    }
    let body: BodyInit | undefined;
    if (opts?.formData) body = opts.formData;
    else if (opts?.body !== undefined) body = JSON.stringify(opts.body);

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body,
    });

    // US-29: silent refresh once on authenticated 401, then retry.
    if (
      res.status === 401 &&
      opts?.auth !== false &&
      !opts?._skipRefresh &&
      !opts?._retried
    ) {
      const renewed = await this.tryRefresh();
      if (renewed) {
        return this.request<T>(method, path, { ...opts, _retried: true });
      }
      throw await readError(res);
    }

    if (res.status === 204 || res.status === 202) {
      if (!res.ok) throw await readError(res);
      const text = await res.text();
      if (!text) return undefined as T;
      try {
        return JSON.parse(text) as T;
      } catch {
        return undefined as T;
      }
    }
    if (!res.ok) throw await readError(res);
    if (opts?.empty) return undefined as T;
    return (await res.json()) as T;
  }

  register(input: {
    email: string;
    password: string;
    registration_number: string;
    vat_number: string;
    address: string;
  }) {
    return this.request<Omit<AuthSuccess, "status">>("POST", "/v1/auth/register", {
      body: input,
      auth: false,
    });
  }

  registerIndividual(input: { email: string; password: string }) {
    return this.request<Omit<AuthSuccess, "status">>("POST", "/v1/auth/register/individual", {
      body: input,
      auth: false,
    });
  }

  login(email: string, password: string, client: Client) {
    return this.request<LoginResult>("POST", "/v1/auth/login", {
      body: { email, password, client },
      auth: false,
    });
  }

  verifyTotp(challenge_token: string, code: string) {
    return this.request<AuthSuccess>("POST", "/v1/auth/totp/verify", {
      body: { challenge_token, code },
      auth: false,
    });
  }

  forgotPassword(email: string) {
    return this.request<Record<string, never>>("POST", "/v1/auth/password/forgot", {
      body: { email },
      auth: false,
    });
  }

  resetPassword(token: string, password: string) {
    return this.request<void>("POST", "/v1/auth/password/reset", {
      body: { token, password },
      auth: false,
    });
  }

  refresh(refresh_token: string) {
    return this.request<{ access_token: string; refresh_token: string }>(
      "POST",
      "/v1/auth/refresh",
      { body: { refresh_token }, auth: false },
    );
  }

  me() {
    return this.request<Me>("GET", "/v1/me");
  }

  logout(refresh_token: string) {
    return this.request<void>("POST", "/v1/auth/logout", { body: { refresh_token } });
  }

  previewInvite(token: string) {
    return this.request<{ email: string; expires_at: string }>("POST", "/v1/auth/invite/preview", {
      body: { token },
      auth: false,
    });
  }

  acceptInvite(input: { token: string; email: string; password: string; client: Client }) {
    return this.request<AuthSuccess>("POST", "/v1/auth/invite/accept", {
      body: input,
      auth: false,
    });
  }

  totpStatus() {
    return this.request<{ enabled: boolean }>("GET", "/v1/auth/totp");
  }

  totpSetup() {
    return this.request<{ otpauth_url: string; secret: string }>("POST", "/v1/auth/totp/setup");
  }

  totpConfirm(code: string) {
    return this.request<void>("POST", "/v1/auth/totp/confirm", { body: { code } });
  }

  totpDisable(code: string) {
    return this.request<void>("POST", "/v1/auth/totp/disable", { body: { code } });
  }

  listAdmins() {
    return this.request<{ items: { id: string; email: string; role: "admin" }[] }>(
      "GET",
      "/v1/admins",
    );
  }

  createAdmin(email: string, password: string) {
    return this.request<{ id: string; email: string; role: "admin"; company_id: string }>(
      "POST",
      "/v1/admins",
      { body: { email, password } },
    );
  }

  listDrivers() {
    return this.request<{ items: Driver[] }>("GET", "/v1/drivers");
  }

  createDriver(email: string) {
    return this.request<Driver & { invite_email_sent: boolean }>("POST", "/v1/drivers", {
      body: { email },
    });
  }

  resendDriverInvite(id: string) {
    return this.request<{ invite_email_sent: boolean }>("POST", `/v1/drivers/${id}/invite/resend`);
  }

  getDriver(id: string) {
    return this.request<Driver>("GET", `/v1/drivers/${id}`);
  }

  patchDriver(id: string, patch: { email?: string; login_enabled?: boolean }) {
    return this.request<Driver>("PATCH", `/v1/drivers/${id}`, { body: patch });
  }

  /** US-27 — hard-delete driver profile (204). Not disable-login. */
  deleteDriver(id: string) {
    return this.request<void>("DELETE", `/v1/drivers/${id}`);
  }

  listVehicles(expiring?: boolean) {
    const q = expiring ? "?expiring=true" : "";
    return this.request<{ items: Vehicle[] }>("GET", `/v1/vehicles${q}`);
  }

  createVehicle(body: VehicleWrite) {
    return this.request<Vehicle>("POST", "/v1/vehicles", { body });
  }

  getVehicle(id: string) {
    return this.request<Vehicle>("GET", `/v1/vehicles/${id}`);
  }

  patchVehicle(id: string, body: VehicleWrite) {
    return this.request<Vehicle>("PATCH", `/v1/vehicles/${id}`, { body });
  }

  /**
   * US-35/36 — multipart field name `file`.
   * Web: Blob/File. Expo: expo-file-system File (`bytes()`). Avoid bare `{ uri }` on Expo fetch.
   */
  putVehicleSideImage(
    id: string,
    side: VehicleSide,
    file: SideImageUploadFile,
    filename = "photo.jpg",
  ) {
    const form = sideImageUploadFormData(file, filename);
    return this.request<Vehicle>("PUT", `/v1/vehicles/${id}/sides/${side}`, { formData: form });
  }

  /** US-37 — clear one side (idempotent). */
  clearVehicleSideImage(id: string, side: VehicleSide) {
    return this.request<Vehicle>("DELETE", `/v1/vehicles/${id}/sides/${side}`);
  }

  home() {
    return this.request<Home>("GET", "/v1/home");
  }

  listDriverVehicles() {
    return this.request<{ items: DriverVehicle[] }>("GET", "/v1/driver/vehicles");
  }

  getDriverTravel() {
    return this.request<{ travel: DriverTravel | null }>("GET", "/v1/driver/travel");
  }

  putDriverTravel(body: { vehicle_id: string; odometer: number | string }) {
    return this.request<DriverTravel>("PUT", "/v1/driver/travel", { body });
  }

  /** US-60 — open Out for signed-in driver, or null. */
  getDriverActiveHandover() {
    return this.request<{ handover: HandoverActive | null }>("GET", "/v1/driver/handovers/active");
  }

  /** US-51/52 — multipart create Out or In (active next-travel vehicle). */
  createDriverHandover(input: CreateHandoverInput) {
    const form = new FormData();
    form.append("type", input.type);
    form.append("mileage", String(input.mileage));
    form.append("next_service_days", String(input.next_service_days));
    form.append("next_service_distance", String(input.next_service_distance));
    if (input.damages_text !== undefined) form.append("damages_text", input.damages_text);
    for (const file of input.damages ?? []) {
      appendImageFormPart(form, "damages", file, "damage.jpg");
    }
    return this.request<HandoverDetail>("POST", "/v1/driver/handovers", { formData: form });
  }

  /** US-55 — Owner/Admin handover history for a vehicle. */
  listVehicleHandovers(vehicleId: string) {
    return this.request<{ items: HandoverListItem[] }>(
      "GET",
      `/v1/vehicles/${vehicleId}/handovers`,
    );
  }

  /** US-56 — Owner/Admin handover detail (+ signed damage URLs). */
  getVehicleHandover(vehicleId: string, handoverId: string) {
    return this.request<HandoverDetail>(
      "GET",
      `/v1/vehicles/${vehicleId}/handovers/${handoverId}`,
    );
  }

  /** US-63 — list own Daily usage (newest first). */
  listDriverDailyUsage() {
    return this.request<{ items: DailyUsage[] }>("GET", "/v1/driver/daily-usage");
  }

  /** US-61 — create Daily usage against active next-travel vehicle. */
  createDriverDailyUsage(input: CreateDailyUsageInput) {
    return this.request<DailyUsage>("POST", "/v1/driver/daily-usage", { body: input });
  }
}

export function memoryTokenStore(): TokenStore {
  let access: string | null = null;
  let refresh: string | null = null;
  return {
    getAccess: () => access,
    getRefresh: () => refresh,
    setTokens: (a, r) => {
      access = a;
      refresh = r;
    },
    clear: () => {
      access = null;
      refresh = null;
    },
  };
}
