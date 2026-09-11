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
import type { FleetContext } from "./context.ts";
import {
  ISO_DATE_RE,
  UUID_RE,
  VehicleCustomExpirationWrite,
  VehicleWrite,
  applyWrite,
  assertCompanyTenantUser,
  assertCompanyUser,
  assertDriver,
  emptyVehicle,
  isUuid,
  parseCustomExpirations,
  parseOptionalMileage,
  requireText,
  toDriverVehicleJson,
  toTravelJson,
} from "./shared.ts";

export class FleetDriver {
  constructor(private readonly ctx: FleetContext) {}
  async listDriverVehicles(claims: AccessClaims) {
    assertDriver(claims);
    const items = (await this.ctx.store.listVehicles(claims.company_id)).map(toDriverVehicleJson);
    return { items };
  }

  async getDriverTravel(claims: AccessClaims) {
    assertDriver(claims);
    const row = await this.ctx.store.findActiveDriverTravel(claims.sub);
    if (!row || row.companyId !== claims.company_id) return { travel: null };
    const vehicle = await this.ctx.store.findVehicle(row.vehicleId, claims.company_id);
    return { travel: toTravelJson(row, vehicle) };
  }

  async putDriverTravel(
    claims: AccessClaims,
    body: { vehicle_id?: string; odometer?: unknown },
  ) {
    assertDriver(claims);
    const vehicleId = typeof body.vehicle_id === "string" ? body.vehicle_id.trim() : "";
    if (!vehicleId) throw errors.validation("vehicle_id is required");
    let odometer: number;
    try {
      odometer = parseOdometer(body.odometer);
    } catch {
      throw errors.validation("odometer must be a number ≥ 0 with at most 1 decimal");
    }
    const vehicle = await this.ctx.store.findVehicle(vehicleId, claims.company_id);
    if (!vehicle) throw errors.notFound();
    const unit = odometerUnitForCountry(vehicle.countryOfRegistration);
    const row: DriverTravelSelection = {
      id: newId(),
      companyId: claims.company_id,
      driverId: claims.sub,
      vehicleId: vehicle.id,
      odometer,
      odometerUnit: unit,
      active: true,
      createdAt: Date.now(),
    };
    await this.ctx.store.withTransaction(async (tx) => {
      await tx.deactivateDriverTravel(claims.sub);
      await tx.insertDriverTravel(row);
    });
    return toTravelJson(row, vehicle);
  }

  async listDriverDailyUsage(claims: AccessClaims) {
    assertDriver(claims);
    const rows = await this.ctx.store.listDailyUsageForDriver(claims.sub, claims.company_id);
    const items = [];
    for (const row of rows) {
      const vehicle = await this.ctx.store.findVehicle(row.vehicleId, claims.company_id);
      items.push(this.ctx.dailyUsageJson(row, vehicle));
    }
    return { items };
  }

  async createDriverDailyUsage(
    claims: AccessClaims,
    body: {
      usage_date?: unknown;
      start_place?: unknown;
      start_distance?: unknown;
      start_time?: unknown;
      end_place?: unknown;
      end_distance?: unknown;
      end_time?: unknown;
    },
  ) {
    assertDriver(claims);

    const usageDate =
      typeof body.usage_date === "string" ? body.usage_date.trim() : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(usageDate)) {
      throw errors.validation("usage_date must be YYYY-MM-DD");
    }

    const startPlace =
      typeof body.start_place === "string" ? body.start_place.trim() : "";
    if (!startPlace) throw errors.validation("Enter a start place");

    const endPlace = typeof body.end_place === "string" ? body.end_place.trim() : "";
    if (!endPlace) throw errors.validation("Enter an end place");

    const startTime =
      typeof body.start_time === "string" ? body.start_time.trim() : "";
    const endTime = typeof body.end_time === "string" ? body.end_time.trim() : "";
    const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRe.test(startTime)) throw errors.validation("Enter a start time");
    if (!timeRe.test(endTime)) throw errors.validation("Enter an end time");
    if (endTime < startTime) {
      throw errors.validation("End time must be at or after start time");
    }

    let startDistance: number;
    let endDistance: number;
    try {
      startDistance = parseOdometer(body.start_distance);
    } catch {
      throw errors.validation(
        "start_distance must be a number ≥ 0 with at most 1 decimal",
      );
    }
    try {
      endDistance = parseOdometer(body.end_distance);
    } catch {
      throw errors.validation(
        "end_distance must be a number ≥ 0 with at most 1 decimal",
      );
    }
    if (endDistance < startDistance) {
      throw errors.validation("End distance must be at least the start distance");
    }

    const travel = await this.ctx.store.findActiveDriverTravel(claims.sub);
    if (!travel || travel.companyId !== claims.company_id) {
      throw errors.dailyUsageNoActiveTravel();
    }
    const vehicle = await this.ctx.store.findVehicle(travel.vehicleId, claims.company_id);
    if (!vehicle) throw errors.dailyUsageNoActiveTravel();

    if (vehicle.mileage != null && startDistance < vehicle.mileage) {
      throw errors.validation(
        "Start distance cannot be lower than the vehicle’s current reading",
      );
    }

    const unit = odometerUnitForCountry(vehicle.countryOfRegistration);
    const row: DriverDailyUsage = {
      id: newId(),
      companyId: claims.company_id,
      driverId: claims.sub,
      vehicleId: vehicle.id,
      usageDate,
      startPlace,
      endPlace,
      startDistance,
      endDistance,
      distanceUnit: unit,
      startTime,
      endTime,
      createdAt: Date.now(),
    };

    await this.ctx.store.insertDailyUsage(row);
    return this.ctx.dailyUsageJson(row, vehicle);
  }

}
