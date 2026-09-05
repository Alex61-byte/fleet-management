export type Role = "owner" | "admin" | "driver";
export type Client = "web" | "mobile";
export type WarningState = "expired" | "due_soon";
export type WarningField =
  | "insurance_on"
  | "inspection_on"
  | "road_tax_on"
  | "registration_on";

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
  registrationNumber: string;
  vatNumber: string;
  address: string;
};

export type Vehicle = {
  id: string;
  companyId: string;
  make: string;
  model: string;
  licensePlate: string;
  countryOfRegistration: string | null;
  insuranceOn: string | null;
  inspectionOn: string | null;
  roadTaxOn: string | null;
  registrationOn: string | null;
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
  token_use: "access";
};

export type PublicPrincipal = {
  id: string;
  email: string;
  role: Role;
  company_id: string;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function toPublicPrincipal(p: Principal): PublicPrincipal {
  return {
    id: p.id,
    email: p.email,
    role: p.role,
    company_id: p.companyId,
  };
}

/** Compliance dates that drive expiry warnings / home expiring (not registration_on). */
const DATE_FIELDS: WarningField[] = [
  "insurance_on",
  "inspection_on",
  "road_tax_on",
];

function dateOf(vehicle: Vehicle, field: WarningField): string | null {
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
  return warnings;
}

export function toVehicleJson(vehicle: Vehicle, today = utcToday()) {
  return {
    id: vehicle.id,
    company_id: vehicle.companyId,
    make: vehicle.make,
    model: vehicle.model,
    license_plate: vehicle.licensePlate,
    country_of_registration: vehicle.countryOfRegistration,
    insurance_on: vehicle.insuranceOn,
    inspection_on: vehicle.inspectionOn,
    road_tax_on: vehicle.roadTaxOn,
    registration_on: vehicle.registrationOn,
    warnings: computeWarnings(vehicle, today),
  };
}
