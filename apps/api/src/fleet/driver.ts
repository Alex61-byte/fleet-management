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
    // Existence check outside txn; monotonic mileage + travel row commit atomically inside.
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
    let updatedVehicle: Vehicle = vehicle;
    await this.ctx.store.withTransaction(async (tx) => {
      const applied = await tx.applyVehicleMileageMonotonic(
        vehicle.id,
        claims.company_id,
        odometer,
      );
      if (applied.status === "not_found") throw errors.notFound();
      if (applied.status === "below_floor") {
        throw errors.validation("Mileage cannot be lower than the vehicle’s current reading.");
      }
      updatedVehicle = applied.vehicle;
      await tx.deactivateDriverTravel(claims.sub);
      await tx.insertDriverTravel(row);
    });
    return toTravelJson(row, updatedVehicle);
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
      refuel_amount?: unknown;
      refuel_at_mileage?: unknown;
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

    const startTime =
      typeof body.start_time === "string" ? body.start_time.trim() : "";
    const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRe.test(startTime)) throw errors.validation("Enter a start time");

    let startDistance: number;
    try {
      startDistance = parseOdometer(body.start_distance);
    } catch {
      throw errors.validation(
        "start_distance must be a number ≥ 0 with at most 1 decimal",
      );
    }

    const refuel = this.parseOptionalRefuel(body);

    const travel = await this.ctx.store.findActiveDriverTravel(claims.sub);
    if (!travel || travel.companyId !== claims.company_id) {
      throw errors.dailyUsageNoActiveTravel();
    }
    const vehicle = await this.ctx.store.findVehicle(travel.vehicleId, claims.company_id);
    if (!vehicle) throw errors.dailyUsageNoActiveTravel();

    const existingOpen = await this.ctx.store.findOpenDailyUsageForDriver(
      claims.sub,
      claims.company_id,
    );
    if (existingOpen) throw errors.dailyUsageAlreadyOpen();

    // Floor from vehicle.mileage and latest **closed** end on same vehicle only (A61).
    const prior = await this.ctx.store.listDailyUsageForDriver(claims.sub, claims.company_id);
    const lastClosedEndOnVehicle =
      prior.find((u) => u.vehicleId === vehicle.id && u.status === "closed" && u.endDistance != null)
        ?.endDistance ?? null;
    const floors: number[] = [];
    if (vehicle.mileage != null) floors.push(vehicle.mileage);
    if (lastClosedEndOnVehicle != null) floors.push(lastClosedEndOnVehicle);
    const minStart = floors.length > 0 ? Math.max(...floors) : null;
    if (minStart != null && startDistance < minStart) {
      throw errors.validation(
        "Start distance cannot be lower than the last recorded end distance",
      );
    }

    const unit = odometerUnitForCountry(vehicle.countryOfRegistration);
    const refuelUnit = unit === "mi" ? ("gal" as const) : ("L" as const);
    const row: DriverDailyUsage = {
      id: newId(),
      companyId: claims.company_id,
      driverId: claims.sub,
      vehicleId: vehicle.id,
      usageDate,
      status: "open",
      startPlace,
      endPlace: null,
      startDistance,
      endDistance: null,
      distanceUnit: unit,
      startTime,
      endTime: null,
      refuelAmount: refuel.amount,
      refuelAmountUnit: refuel.amount != null ? refuelUnit : null,
      refuelAtMileage: refuel.atMileage,
      createdAt: Date.now(),
      closedAt: null,
    };

    try {
      await this.ctx.store.insertDailyUsage(row);
    } catch (err) {
      if (isUniqueViolation(err)) throw errors.dailyUsageAlreadyOpen();
      throw err;
    }
    return this.ctx.dailyUsageJson(row, vehicle);
  }

  async endDriverDailyUsage(
    claims: AccessClaims,
    body: {
      end_place?: unknown;
      end_distance?: unknown;
      end_time?: unknown;
      refuel_amount?: unknown;
      refuel_at_mileage?: unknown;
    },
  ) {
    assertDriver(claims);

    const endPlace = typeof body.end_place === "string" ? body.end_place.trim() : "";
    if (!endPlace) throw errors.validation("Enter an end place");

    const endTime = typeof body.end_time === "string" ? body.end_time.trim() : "";
    const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRe.test(endTime)) throw errors.validation("Enter an end time");

    let endDistance: number;
    try {
      endDistance = parseOdometer(body.end_distance);
    } catch {
      throw errors.validation(
        "end_distance must be a number ≥ 0 with at most 1 decimal",
      );
    }

    const open = await this.ctx.store.findOpenDailyUsageForDriver(
      claims.sub,
      claims.company_id,
    );
    if (!open) throw errors.dailyUsageNoOpen();

    if (endDistance < open.startDistance) {
      throw errors.validation("End distance must be at least the start distance");
    }
    if (endTime < open.startTime) {
      throw errors.validation("End time must be at or after start time");
    }

    const refuel = this.parseOptionalRefuel(body);
    const refuelUnit = open.distanceUnit === "mi" ? ("gal" as const) : ("L" as const);

    const closed: DriverDailyUsage = {
      ...open,
      status: "closed",
      endPlace,
      endDistance,
      endTime,
      refuelAmount: refuel.amountSpecified ? refuel.amount : open.refuelAmount,
      refuelAmountUnit: refuel.amountSpecified
        ? refuel.amount != null
          ? refuelUnit
          : null
        : open.refuelAmountUnit,
      refuelAtMileage: refuel.atMileageSpecified ? refuel.atMileage : open.refuelAtMileage,
      closedAt: Date.now(),
    };

    await this.ctx.store.updateDailyUsage(closed);
    const vehicle = await this.ctx.store.findVehicle(closed.vehicleId, claims.company_id);
    return this.ctx.dailyUsageJson(closed, vehicle);
  }

  private parseOptionalRefuel(body: {
    refuel_amount?: unknown;
    refuel_at_mileage?: unknown;
  }): {
    amount: number | null;
    atMileage: number | null;
    amountSpecified: boolean;
    atMileageSpecified: boolean;
  } {
    const amountSpecified = body.refuel_amount !== undefined;
    const atMileageSpecified = body.refuel_at_mileage !== undefined;
    let amount: number | null = null;
    let atMileage: number | null = null;

    if (amountSpecified) {
      if (body.refuel_amount === null || body.refuel_amount === "") {
        amount = null;
      } else {
        try {
          amount = parseOdometer(body.refuel_amount);
        } catch {
          throw errors.validation(
            "refuel_amount must be a number ≥ 0 with at most 1 decimal",
          );
        }
      }
    }
    if (atMileageSpecified) {
      if (body.refuel_at_mileage === null || body.refuel_at_mileage === "") {
        atMileage = null;
      } else {
        try {
          atMileage = parseOdometer(body.refuel_at_mileage);
        } catch {
          throw errors.validation(
            "refuel_at_mileage must be a number ≥ 0 with at most 1 decimal",
          );
        }
      }
    }
    return { amount, atMileage, amountSpecified, atMileageSpecified };
  }

}
