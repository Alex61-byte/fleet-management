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

export class FleetVehicles {
  constructor(private readonly ctx: FleetContext) {}
  async list(claims: AccessClaims, expiring?: boolean) {
    assertCompanyUser(claims);
    let items = await Promise.all(
      (await this.ctx.store.listVehicles(claims.company_id)).map((v) => this.ctx.vehicleJson(v)),
    );
    if (expiring) items = items.filter((v) => v.warnings.length > 0);
    return { items };
  }

  async create(claims: AccessClaims, body: VehicleWrite) {
    assertCompanyUser(claims);
    const make = requireText(body.make, "make");
    const model = requireText(body.model, "model");
    const licensePlate = requireText(body.license_plate, "license_plate");
    const vehicle: Vehicle = applyWrite(emptyVehicle(claims.company_id), {
      ...body,
      make,
      model,
      license_plate: licensePlate,
    });
    await this.ctx.store.insertVehicle(vehicle);
    return this.ctx.vehicleJson(vehicle);
  }

  async get(claims: AccessClaims, id: string) {
    assertCompanyUser(claims);
    const vehicle = await this.ctx.store.findVehicle(id, claims.company_id);
    if (!vehicle) throw errors.notFound();
    return this.ctx.vehicleJson(vehicle);
  }

  async patch(claims: AccessClaims, id: string, body: VehicleWrite) {
    assertCompanyUser(claims);
    const existing = await this.ctx.store.findVehicle(id, claims.company_id);
    if (!existing) throw errors.notFound();
    const vehicle = applyWrite(existing, body);
    await this.ctx.store.updateVehicle(vehicle);
    return this.ctx.vehicleJson(vehicle);
  }

  async putSideImage(
    claims: AccessClaims,
    id: string,
    side: VehicleSide,
    bytes: Uint8Array,
  ) {
    await assertCompanyTenantUser(this.ctx.store, claims);
    if (bytes.byteLength === 0) throw errors.validation("file is required");
    if (bytes.byteLength > MAX_VEHICLE_IMAGE_BYTES) {
      throw errors.validation("Image must be 5 MB or smaller.");
    }
    const detected = detectImage(bytes);
    if (!detected) throw errors.validation("Upload an image file.");

    const existing = await this.ctx.store.findVehicle(id, claims.company_id);
    if (!existing) throw errors.notFound();

    const storage = this.ctx.requireImages();
    const path = sideObjectKey(existing.companyId, existing.id, side, detected.ext);
    const previous = vehicleSidePath(existing, side);

    try {
      await storage.upload(path, bytes, detected.mime);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw errors.storageUnavailable();
    }

    const updated = withVehicleSidePath(existing, side, path);
    await this.ctx.store.updateVehicle(updated);

    if (previous && previous !== path) {
      try {
        await storage.remove(previous);
      } catch {
        /* best-effort orphan cleanup on replace */
      }
    }

    return this.ctx.vehicleJson(updated);
  }

  /**
   * US-37 — delete one side’s object from storage and clear the DB path.
   * Storage delete runs first so we never claim empty while the blob still exists.
   * Idempotent when the side is already empty.
   */
  async clearSideImage(claims: AccessClaims, id: string, side: VehicleSide) {
    await assertCompanyTenantUser(this.ctx.store, claims);
    const existing = await this.ctx.store.findVehicle(id, claims.company_id);
    if (!existing) throw errors.notFound();

    const previous = vehicleSidePath(existing, side);
    if (!previous) return this.ctx.vehicleJson(existing);

    const storage = this.ctx.requireImages();
    try {
      await storage.remove(previous);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw errors.storageUnavailable();
    }

    const updated = withVehicleSidePath(existing, side, null);
    await this.ctx.store.updateVehicle(updated);
    return this.ctx.vehicleJson(updated);
  }

  async home(claims: AccessClaims) {
    assertCompanyUser(claims);
    const { drivers, vehicles } = await this.ctx.store.counts(claims.company_id);
    const expiring_vehicles = (
      await Promise.all(
        (await this.ctx.store.listVehicles(claims.company_id)).map((v) => this.ctx.vehicleJson(v)),
      )
    )
      .filter((v) => v.warnings.length > 0)
      .map((v) => ({
        id: v.id,
        make: v.make,
        model: v.model,
        license_plate: v.license_plate,
        warnings: v.warnings,
      }));
    return {
      driver_count: drivers,
      vehicle_count: vehicles,
      expiring_vehicles,
    };
  }

  async listServiceDue(claims: AccessClaims) {
    assertCompanyUser(claims);
    const vehicles = await this.ctx.store.listVehicles(claims.company_id);
    const handovers = await this.ctx.store.listLatestHandoversForCompany(claims.company_id);
    const latestByVehicle = new Map<string, VehicleHandover>();
    for (const h of handovers) {
      if (!latestByVehicle.has(h.vehicleId)) latestByVehicle.set(h.vehicleId, h);
    }
    const today = utcToday();
    const todayMs = Date.parse(`${today}T00:00:00.000Z`);
    const items = [];
    for (const vehicle of vehicles) {
      const h = latestByVehicle.get(vehicle.id);
      if (!h) continue;
      const handoverDay = new Date(h.createdAt).toISOString().slice(0, 10);
      const handoverMs = Date.parse(`${handoverDay}T00:00:00.000Z`);
      const daysElapsed = Math.floor((todayMs - handoverMs) / 86_400_000);
      const dueByDays = daysElapsed >= h.nextServiceDays;
      let dueByDistance = false;
      let distanceRemaining: number | null = null;
      if (vehicle.mileage != null) {
        const threshold = h.mileage + h.nextServiceDistance;
        distanceRemaining = Math.round((threshold - vehicle.mileage) * 10) / 10;
        dueByDistance = vehicle.mileage >= threshold;
      }
      if (!dueByDays && !dueByDistance) continue;
      const daysOverdue = dueByDays ? daysElapsed - h.nextServiceDays : null;
      items.push({
        vehicle_id: vehicle.id,
        vehicle: this.ctx.vehicleSummary(vehicle),
        handover_id: h.id,
        handover_created_at: new Date(h.createdAt).toISOString(),
        next_service_days: h.nextServiceDays,
        next_service_distance: h.nextServiceDistance,
        next_service_distance_unit: h.nextServiceDistanceUnit,
        days_elapsed: daysElapsed,
        days_overdue: daysOverdue,
        vehicle_mileage: vehicle.mileage,
        handover_mileage: h.mileage,
        distance_remaining: distanceRemaining,
        due_by_days: dueByDays,
        due_by_distance: dueByDistance,
      });
    }
    items.sort((a, b) => {
      const ao = a.days_overdue ?? -1;
      const bo = b.days_overdue ?? -1;
      return bo - ao || a.vehicle_id.localeCompare(b.vehicle_id);
    });
    return { items };
  }

}
