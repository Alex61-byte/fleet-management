import { AppError, errors } from "../errors.ts";
import { newId } from "../crypto.ts";
import type {
  AccessClaims,
  ComplianceDocType,
  DriverDailyUsage,
  DriverTravelSelection,
  HandoverType,
  Vehicle,
  VehicleComplianceDocument,
  VehicleCustomExpiration,
  VehicleHandover,
  VehicleHandoverImage,
  VehicleIssue,
  VehicleSide,
  Warning,
} from "../domain.ts";
import {
  computeWarnings,
  odometerUnitForCountry,
  parseOdometer,
  toVehicleJson,
  utcToday,
  vehicleLabel,
  vehicleSidePath,
  withVehicleSidePath,
} from "../domain.ts";
import type { Store } from "../store.ts";
import { isUniqueViolation } from "../store.ts";
import type { Mailer } from "../mailer.ts";
import {
  complianceDocObjectKey,
  detectComplianceUpload,
  detectImage,
  handoverDamageObjectKey,
  MAX_COMPLIANCE_DOC_BYTES,
  MAX_COMPLIANCE_DOCS_PER_VEHICLE,
  MAX_HANDOVER_DAMAGE_IMAGES,
  MAX_VEHICLE_IMAGE_BYTES,
  sideObjectKey,
  type VehicleImageStorage,
} from "../vehicle-image-storage.ts";

export type VehicleCustomExpirationWrite = {
  id?: string | null;
  label: string;
  expires_on: string;
};

export type VehicleWrite = {
  make?: string;
  model?: string;
  license_plate?: string;
  country_of_registration?: string | null;
  mileage?: number | string | null;
  insurance_on?: string | null;
  inspection_on?: string | null;
  road_tax_on?: string | null;
  registration_on?: string | null;
  /** When present on POST/PATCH: full replace. Omitted on PATCH: unchanged. `[]` clears. Parsed via parseCustomExpirations. */
  custom_expirations?: unknown;
};

export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Full-replace parse for `custom_expirations` (ADR-019). Server mints id when omitted/null. */
export function parseCustomExpirations(raw: unknown): VehicleCustomExpiration[] {
  if (raw === undefined) {
    throw errors.validation("custom_expirations must be an array");
  }
  if (!Array.isArray(raw)) {
    throw errors.validation("custom_expirations must be an array");
  }
  if (raw.length > 10) {
    throw errors.validation("At most 10 custom expirations");
  }

  const seenIds = new Set<string>();
  const seenLabels = new Set<string>();
  const out: VehicleCustomExpiration[] = [];

  for (const item of raw) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      throw errors.validation("Each custom expiration must be an object");
    }
    const row = item as Record<string, unknown>;

    let id: string | null = null;
    if (row.id !== undefined && row.id !== null) {
      if (typeof row.id !== "string" || !isUuid(row.id)) {
        throw errors.validation("custom expiration id must be a UUID");
      }
      id = row.id;
      if (seenIds.has(id)) {
        throw errors.validation("Duplicate custom expiration id");
      }
      seenIds.add(id);
    }

    if (typeof row.label !== "string") {
      throw errors.validation("Enter a label (1–80 characters).");
    }
    const label = row.label.trim();
    if (!label) {
      throw errors.validation("Enter a label (1–80 characters).");
    }
    if (label.length > 80) {
      throw errors.validation("Label must be 80 characters or fewer.");
    }
    const labelKey = label.toLowerCase();
    if (seenLabels.has(labelKey)) {
      throw errors.validation("Label must be unique on this vehicle.");
    }
    seenLabels.add(labelKey);

    if (typeof row.expires_on !== "string" || !ISO_DATE_RE.test(row.expires_on)) {
      throw errors.validation("expires_on must be YYYY-MM-DD");
    }
    const expiresOn = row.expires_on;

    out.push({
      id: id ?? newId(),
      label,
      expiresOn,
    });
  }

  return out;
}

export function parseOptionalMileage(raw: unknown): number | null {
  if (raw === null) return null;
  if (typeof raw === "string" && raw.trim() === "") return null;
  try {
    return parseOdometer(raw);
  } catch {
    throw errors.validation("mileage must be a number ≥ 0 with at most 1 decimal");
  }
}

export function assertCompanyUser(claims: AccessClaims) {
  if (claims.role === "driver") throw errors.forbidden();
}

export function assertDriver(claims: AccessClaims) {
  if (claims.role !== "driver") throw errors.forbidden();
}

/** Company-kind Owner/Admin only — Individual tenants cannot use driver-ops / image history surfaces. */
export async function assertCompanyTenantUser(store: Store, claims: AccessClaims) {
  assertCompanyUser(claims);
  const company = await store.findCompany(claims.company_id);
  if (company?.accountKind !== "company") throw errors.forbidden();
}

export function requireText(value: string | undefined, field: string): string {
  const v = value?.trim() ?? "";
  if (!v) throw errors.validation(`${field} is required`);
  return v;
}

export function applyWrite(target: Vehicle, body: VehicleWrite): Vehicle {
  const customExpirations =
    body.custom_expirations === undefined
      ? target.customExpirations
      : parseCustomExpirations(body.custom_expirations);
  return {
    ...target,
    make: body.make !== undefined ? body.make.trim() : target.make,
    model: body.model !== undefined ? body.model.trim() : target.model,
    licensePlate: body.license_plate !== undefined ? body.license_plate.trim() : target.licensePlate,
    countryOfRegistration:
      body.country_of_registration === undefined
        ? target.countryOfRegistration
        : body.country_of_registration,
    mileage: body.mileage !== undefined ? parseOptionalMileage(body.mileage) : target.mileage,
    insuranceOn: body.insurance_on === undefined ? target.insuranceOn : body.insurance_on,
    inspectionOn: body.inspection_on === undefined ? target.inspectionOn : body.inspection_on,
    roadTaxOn: body.road_tax_on === undefined ? target.roadTaxOn : body.road_tax_on,
    registrationOn: body.registration_on === undefined ? target.registrationOn : body.registration_on,
    customExpirations,
  };
}

export function emptyVehicle(companyId: string): Vehicle {
  return {
    id: newId(),
    companyId,
    make: "",
    model: "",
    licensePlate: "",
    countryOfRegistration: null,
    mileage: null,
    insuranceOn: null,
    inspectionOn: null,
    roadTaxOn: null,
    registrationOn: null,
    customExpirations: [],
    imageFrontPath: null,
    imageLeftPath: null,
    imageRightPath: null,
    imageBackPath: null,
  };
}

export function toDriverVehicleJson(v: Vehicle) {
  const unit = odometerUnitForCountry(v.countryOfRegistration);
  return {
    id: v.id,
    make: v.make,
    model: v.model,
    license_plate: v.licensePlate,
    country_of_registration: v.countryOfRegistration,
    mileage: v.mileage,
    mileage_unit: unit,
    odometer_unit: unit,
    label: vehicleLabel(v.make, v.model),
  };
}

export function toTravelJson(row: DriverTravelSelection, vehicle: Vehicle | undefined) {
  return {
    id: row.id,
    vehicle_id: row.vehicleId,
    odometer: row.odometer,
    odometer_unit: row.odometerUnit,
    created_at: new Date(row.createdAt).toISOString(),
    vehicle: vehicle
      ? {
          id: vehicle.id,
          make: vehicle.make,
          model: vehicle.model,
          license_plate: vehicle.licensePlate,
          label: vehicleLabel(vehicle.make, vehicle.model),
        }
      : null,
  };
}

