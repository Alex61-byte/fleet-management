export type Role = "owner" | "admin" | "driver";
export type Client = "web" | "mobile";
export type AccountKind = "company" | "individual";
export type WarningState = "expired" | "due_soon";
export type BuiltInWarningField =
  | "insurance_on"
  | "inspection_on"
  | "road_tax_on"
  | "registration_on";
/** Server warnings use built-ins or `custom:<uuid>` (ADR-019). */
export type WarningField = BuiltInWarningField | `custom:${string}`;

export type VehicleCustomExpiration = {
  id: string;
  label: string;
  expiresOn: string;
};

export type Principal = {
  id: string;
  companyId: string;
  email: string;
  role: Role;
  /** Null until invite accept (drivers) or always set for Owner/Admin. */
  passwordHash: string | null;
  mustChangePassword: boolean;
  loginEnabled: boolean;
  totpEnabled: boolean;
  totpSecret: string | null;
  totpPendingSecret: string | null;
  inviteTokenHash: string | null;
  inviteExpiresAt: number | null;
};

export type CompanyProfile = {
  id: string;
  accountKind: AccountKind;
  /** Display name; required on company create; may be empty for legacy company tenants until Owner sets it. */
  name: string;
  registrationNumber: string;
  vatNumber: string;
  address: string;
};

export type VehicleSide = "FRONT" | "LEFT" | "RIGHT" | "BACK";

export const VEHICLE_SIDES: VehicleSide[] = ["FRONT", "LEFT", "RIGHT", "BACK"];

export type Vehicle = {
  id: string;
  companyId: string;
  make: string;
  model: string;
  licensePlate: string;
  countryOfRegistration: string | null;
  /** Optional current odometer reading on the fleet vehicle (null = unknown). */
  mileage: number | null;
  insuranceOn: string | null;
  inspectionOn: string | null;
  roadTaxOn: string | null;
  registrationOn: string | null;
  /** Optional labeled expirations (max 10); empty array when none (ADR-019). */
  customExpirations: VehicleCustomExpiration[];
  imageFrontPath: string | null;
  imageLeftPath: string | null;
  imageRightPath: string | null;
  imageBackPath: string | null;
};

export type OdometerUnit = "mi" | "km";

export type DriverTravelSelection = {
  id: string;
  companyId: string;
  driverId: string;
  vehicleId: string;
  odometer: number;
  odometerUnit: OdometerUnit;
  active: boolean;
  createdAt: number;
};

export type HandoverType = "out" | "in";
export type HandoverStatus = "open" | "closed" | "voided";

export type VehicleHandover = {
  id: string;
  companyId: string;
  vehicleId: string;
  driverId: string | null;
  type: HandoverType;
  status: HandoverStatus;
  handoverOutId: string | null;
  mileage: number;
  mileageUnit: OdometerUnit;
  nextServiceDays: number;
  nextServiceDistance: number;
  nextServiceDistanceUnit: OdometerUnit;
  damagesText: string | null;
  createdAt: number;
  closedAt: number | null;
  voidedAt: number | null;
};

export type VehicleHandoverImage = {
  id: string;
  companyId: string;
  vehicleId: string;
  handoverId: string;
  storagePath: string;
  sortOrder: number;
  createdAt: number;
};

export type ComplianceDocType =
  | "insurance"
  | "inspection"
  | "road_tax"
  | "registration"
  | "other";

export type VehicleComplianceDocument = {
  id: string;
  companyId: string;
  vehicleId: string;
  docType: ComplianceDocType;
  label: string;
  storagePath: string;
  contentType: string;
  byteSize: number;
  createdAt: number;
};

export type IssueSource = "manual" | "handover";
export type IssueStatus = "open" | "closed";

export type VehicleIssue = {
  id: string;
  companyId: string;
  vehicleId: string;
  createdByPrincipalId: string | null;
  source: IssueSource;
  handoverId: string | null;
  title: string;
  description: string;
  status: IssueStatus;
  createdAt: number;
  closedAt: number | null;
};

export type DailyUsageStatus = "open" | "closed";
export type RefuelAmountUnit = "L" | "gal";

export type DriverDailyUsage = {
  id: string;
  companyId: string;
  driverId: string;
  vehicleId: string;
  usageDate: string;
  status: DailyUsageStatus;
  startPlace: string;
  endPlace: string | null;
  startDistance: number;
  endDistance: number | null;
  distanceUnit: OdometerUnit;
  startTime: string;
  endTime: string | null;
  refuelAmount: number | null;
  refuelAmountUnit: RefuelAmountUnit | null;
  refuelAtMileage: number | null;
  createdAt: number;
  closedAt: number | null;
};

/** Miles jurisdictions (ADR-012 / A34). Empty/unknown → km. */
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

export function vehicleLabel(make: string, model: string): string {
  return `${make} ${model}`.replace(/\s+/g, " ").trim();
}

export function parseOdometer(raw: unknown): number {
  let n: number;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    n = raw;
  } else if (typeof raw === "string" && raw.trim() !== "") {
    const trimmed = raw.trim();
    if (!/^\d+(\.\d+)?$/.test(trimmed)) throw new Error("odometer");
    n = Number(trimmed);
  } else {
    throw new Error("odometer");
  }
  if (!Number.isFinite(n) || n < 0) throw new Error("odometer");
  const rounded = Math.round(n * 10) / 10;
  // Reject >1 decimal place (AJV may coerce "12.34" → number).
  if (Math.abs(n - rounded) > 1e-9) throw new Error("odometer");
  return rounded;
}

export type Warning = { field: WarningField; state: WarningState };

export type AccessClaims = {
  sub: string;
  company_id: string;
  role: Role;
  must_change_password: boolean;
  /** Present on newly issued tokens; may be missing on legacy tokens — gates load DB. */
  account_kind?: AccountKind;
  token_use: "access";
};

export type PublicPrincipal = {
  id: string;
  email: string;
  role: Role;
  company_id: string;
  account_kind: AccountKind;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function toPublicPrincipal(p: Principal, accountKind: AccountKind): PublicPrincipal {
  return {
    id: p.id,
    email: p.email,
    role: p.role,
    company_id: p.companyId,
    account_kind: accountKind,
  };
}

/** Built-in compliance dates that drive expiry warnings / home expiring (not registration_on). */
const DATE_FIELDS: BuiltInWarningField[] = [
  "insurance_on",
  "inspection_on",
  "road_tax_on",
];

function dateOf(vehicle: Vehicle, field: BuiltInWarningField): string | null {
  switch (field) {
    case "insurance_on":
      return vehicle.insuranceOn;
    case "inspection_on":
      return vehicle.inspectionOn;
    case "road_tax_on":
      return vehicle.roadTaxOn;
    case "registration_on":
      return vehicle.registrationOn;
  }
}

export function customWarningField(id: string): `custom:${string}` {
  return `custom:${id}`;
}

export function isCustomWarningField(field: string): field is `custom:${string}` {
  return field.startsWith("custom:");
}

export function utcToday(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function computeWarnings(vehicle: Vehicle, today = utcToday()): Warning[] {
  const horizon = addDays(today, 30);
  const warnings: Warning[] = [];
  for (const field of DATE_FIELDS) {
    const value = dateOf(vehicle, field);
    if (!value) continue;
    if (value < today) warnings.push({ field, state: "expired" });
    else if (value <= horizon) warnings.push({ field, state: "due_soon" });
  }
  for (const row of vehicle.customExpirations) {
    const value = row.expiresOn;
    if (!value) continue;
    const field = customWarningField(row.id);
    if (value < today) warnings.push({ field, state: "expired" });
    else if (value <= horizon) warnings.push({ field, state: "due_soon" });
  }
  return warnings;
}

export function vehicleSidePath(vehicle: Vehicle, side: VehicleSide): string | null {
  switch (side) {
    case "FRONT":
      return vehicle.imageFrontPath;
    case "LEFT":
      return vehicle.imageLeftPath;
    case "RIGHT":
      return vehicle.imageRightPath;
    case "BACK":
      return vehicle.imageBackPath;
  }
}

export function withVehicleSidePath(
  vehicle: Vehicle,
  side: VehicleSide,
  path: string | null,
): Vehicle {
  switch (side) {
    case "FRONT":
      return { ...vehicle, imageFrontPath: path };
    case "LEFT":
      return { ...vehicle, imageLeftPath: path };
    case "RIGHT":
      return { ...vehicle, imageRightPath: path };
    case "BACK":
      return { ...vehicle, imageBackPath: path };
  }
}

export function hasSideImages(vehicle: Vehicle): boolean {
  return VEHICLE_SIDES.some((side) => Boolean(vehicleSidePath(vehicle, side)));
}

export type SideImageJson = { path: string; url: string } | null;

export async function toVehicleJson(
  vehicle: Vehicle,
  today = utcToday(),
  signUrl?: (path: string) => Promise<string>,
) {
  const side_images = {
    FRONT: null as SideImageJson,
    LEFT: null as SideImageJson,
    RIGHT: null as SideImageJson,
    BACK: null as SideImageJson,
  };
  for (const side of VEHICLE_SIDES) {
    const path = vehicleSidePath(vehicle, side);
    if (!path) continue;
    if (!signUrl) {
      side_images[side] = { path, url: "" };
      continue;
    }
    side_images[side] = { path, url: await signUrl(path) };
  }
  return {
    id: vehicle.id,
    company_id: vehicle.companyId,
    make: vehicle.make,
    model: vehicle.model,
    license_plate: vehicle.licensePlate,
    country_of_registration: vehicle.countryOfRegistration,
    mileage: vehicle.mileage,
    mileage_unit: odometerUnitForCountry(vehicle.countryOfRegistration),
    insurance_on: vehicle.insuranceOn,
    inspection_on: vehicle.inspectionOn,
    road_tax_on: vehicle.roadTaxOn,
    registration_on: vehicle.registrationOn,
    custom_expirations: vehicle.customExpirations.map((row) => ({
      id: row.id,
      label: row.label,
      expires_on: row.expiresOn,
    })),
    warnings: computeWarnings(vehicle, today),
    has_side_images: hasSideImages(vehicle),
    side_images,
  };
}
