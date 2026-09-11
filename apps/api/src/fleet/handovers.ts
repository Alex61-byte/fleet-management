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

export class FleetHandovers {
  constructor(private readonly ctx: FleetContext) {}
  async getDriverActiveHandover(claims: AccessClaims) {
    assertDriver(claims);
    const open = await this.ctx.store.findOpenOutForDriver(claims.sub);
    if (!open || open.companyId !== claims.company_id) return { handover: null };
    const vehicle = await this.ctx.store.findVehicle(open.vehicleId, claims.company_id);
    return {
      handover: {
        id: open.id,
        type: open.type,
        status: open.status,
        vehicle_id: open.vehicleId,
        mileage: open.mileage,
        mileage_unit: open.mileageUnit,
        created_at: new Date(open.createdAt).toISOString(),
        vehicle: vehicle ? this.ctx.vehicleSummary(vehicle) : null,
      },
    };
  }

  async createDriverHandover(
    claims: AccessClaims,
    input: {
      type?: string;
      mileage?: unknown;
      next_service_days?: unknown;
      next_service_distance?: unknown;
      damages_text?: unknown;
      damageFiles?: Uint8Array[];
    },
  ) {
    assertDriver(claims);
    const typeRaw = typeof input.type === "string" ? input.type.trim().toLowerCase() : "";
    if (typeRaw !== "out" && typeRaw !== "in") {
      throw errors.validation("type must be out or in");
    }
    const type = typeRaw as HandoverType;

    let mileage: number;
    try {
      mileage = parseOdometer(input.mileage);
    } catch {
      throw errors.validation("mileage must be a number ≥ 0 with at most 1 decimal");
    }

    const daysRaw = input.next_service_days;
    let nextServiceDays: number;
    if (typeof daysRaw === "number" && Number.isInteger(daysRaw)) {
      nextServiceDays = daysRaw;
    } else if (typeof daysRaw === "string" && /^\d+$/.test(daysRaw.trim())) {
      nextServiceDays = Number(daysRaw.trim());
    } else {
      throw errors.validation("next_service_days must be an integer ≥ 1");
    }
    if (!Number.isInteger(nextServiceDays) || nextServiceDays < 1) {
      throw errors.validation("next_service_days must be an integer ≥ 1");
    }

    let nextServiceDistance: number;
    try {
      nextServiceDistance = parseOdometer(input.next_service_distance);
    } catch {
      throw errors.validation(
        "next_service_distance must be a number ≥ 0 with at most 1 decimal",
      );
    }

    let damagesText: string | null = null;
    if (input.damages_text !== undefined && input.damages_text !== null) {
      if (typeof input.damages_text !== "string") {
        throw errors.validation("damages_text must be a string");
      }
      const trimmed = input.damages_text.trim();
      damagesText = trimmed.length ? trimmed : null;
    }

    const damageFiles = input.damageFiles ?? [];
    if (damageFiles.length > MAX_HANDOVER_DAMAGE_IMAGES) {
      throw errors.validation("At most 10 damage images are allowed.");
    }
    for (const bytes of damageFiles) {
      if (bytes.byteLength === 0) throw errors.validation("Upload an image file.");
      if (bytes.byteLength > MAX_VEHICLE_IMAGE_BYTES) {
        throw errors.validation("Image must be 5 MB or smaller.");
      }
      if (!detectImage(bytes)) throw errors.validation("Upload an image file.");
    }

    const travel = await this.ctx.store.findActiveDriverTravel(claims.sub);
    if (!travel || travel.companyId !== claims.company_id) {
      throw errors.handoverNoActiveTravel();
    }
    const vehicle = await this.ctx.store.findVehicle(travel.vehicleId, claims.company_id);
    if (!vehicle) throw errors.handoverNoActiveTravel();

    const unit = odometerUnitForCountry(vehicle.countryOfRegistration);
    if (vehicle.mileage != null && mileage < vehicle.mileage) {
      throw errors.validation("Mileage cannot be lower than the vehicle’s current reading.");
    }

    let openOut: VehicleHandover | undefined;
    if (type === "out") {
      const vehicleOpen = await this.ctx.store.findOpenOutForVehicle(vehicle.id, claims.company_id);
      if (vehicleOpen) throw errors.handoverVehicleOpen();
      const driverOpen = await this.ctx.store.findOpenOutForDriver(claims.sub);
      if (driverOpen) throw errors.handoverDriverOpen();
    } else {
      openOut = await this.ctx.store.findOpenOutForVehicle(vehicle.id, claims.company_id);
      if (!openOut) throw errors.handoverNoOpenOut();
      if (openOut.driverId !== claims.sub) throw errors.handoverWrongDriver();
      if (mileage < openOut.mileage) {
        throw errors.validation("Mileage cannot be lower than the Out mileage.");
      }
    }

    const now = Date.now();
    const handoverId = newId();
    const uploadedPaths: string[] = [];
    const imageRows: VehicleHandoverImage[] = [];

    if (damageFiles.length) {
      const storage = this.ctx.requireImages();
      for (let i = 0; i < damageFiles.length; i++) {
        const bytes = damageFiles[i]!;
        const detected = detectImage(bytes)!;
        const imageId = newId();
        const path = handoverDamageObjectKey(
          claims.company_id,
          vehicle.id,
          handoverId,
          imageId,
          detected.ext,
        );
        try {
          await storage.upload(path, bytes, detected.mime);
        } catch (err) {
          for (const p of uploadedPaths) {
            try {
              await storage.remove(p);
            } catch {
              /* best-effort */
            }
          }
          if (err instanceof AppError) throw err;
          throw errors.storageUnavailable();
        }
        uploadedPaths.push(path);
        imageRows.push({
          id: imageId,
          companyId: claims.company_id,
          vehicleId: vehicle.id,
          handoverId,
          storagePath: path,
          sortOrder: i,
          createdAt: now,
        });
      }
    }

    const row: VehicleHandover = {
      id: handoverId,
      companyId: claims.company_id,
      vehicleId: vehicle.id,
      driverId: claims.sub,
      type,
      status: type === "out" ? "open" : "closed",
      handoverOutId: type === "in" ? openOut!.id : null,
      mileage,
      mileageUnit: unit,
      nextServiceDays,
      nextServiceDistance,
      nextServiceDistanceUnit: unit,
      damagesText,
      createdAt: now,
      closedAt: type === "in" ? now : null,
      voidedAt: null,
    };

    try {
      await this.ctx.store.withTransaction(async (tx) => {
        if (type === "in" && openOut) {
          await tx.updateHandover({
            ...openOut,
            status: "closed",
            closedAt: now,
          });
        }
        await tx.insertHandover(row);
        for (const img of imageRows) {
          await tx.insertHandoverImage(img);
        }
        const applied = await tx.applyVehicleMileageMonotonic(
          vehicle.id,
          claims.company_id,
          mileage,
        );
        if (applied.status === "not_found") throw errors.notFound();
        if (applied.status === "below_floor") {
          throw errors.validation("Mileage cannot be lower than the vehicle’s current reading.");
        }
      });
    } catch (err) {
      if (uploadedPaths.length && this.ctx.images) {
        for (const p of uploadedPaths) {
          try {
            await this.ctx.images.remove(p);
          } catch {
            /* best-effort */
          }
        }
      }
      if (isUniqueViolation(err)) {
        if (type === "out") throw errors.handoverVehicleOpen();
        throw errors.handoverNoOpenOut();
      }
      throw err;
    }

    if (damagesText) {
      const issue: VehicleIssue = {
        id: newId(),
        companyId: claims.company_id,
        vehicleId: vehicle.id,
        createdByPrincipalId: claims.sub,
        source: "handover",
        handoverId: handoverId,
        title: damagesText.length > 120 ? `${damagesText.slice(0, 117)}...` : damagesText,
        description: damagesText,
        status: "open",
        createdAt: now,
        closedAt: null,
      };
      try {
        await this.ctx.store.insertIssue(issue);
      } catch {
        /* non-fatal: handover already committed */
      }
    }

    return this.ctx.handoverDetail(row, { signImages: false, vehicle: { ...vehicle, mileage } });
  }

  async listVehicleHandovers(claims: AccessClaims, vehicleId: string) {
    await assertCompanyTenantUser(this.ctx.store, claims);
    const vehicle = await this.ctx.store.findVehicle(vehicleId, claims.company_id);
    if (!vehicle) throw errors.notFound();
    const rows = await this.ctx.store.listHandoversForVehicle(vehicleId, claims.company_id);
    const items = [];
    for (const row of rows) {
      items.push(await this.ctx.handoverListItem(row));
    }
    return { items };
  }

  async getVehicleHandover(claims: AccessClaims, vehicleId: string, handoverId: string) {
    await assertCompanyTenantUser(this.ctx.store, claims);
    const vehicle = await this.ctx.store.findVehicle(vehicleId, claims.company_id);
    if (!vehicle) throw errors.notFound();
    const row = await this.ctx.store.findHandover(handoverId, claims.company_id);
    if (!row || row.vehicleId !== vehicleId) throw errors.notFound();
    return this.ctx.handoverDetail(row, { signImages: true, vehicle });
  }

  /** US-111 — Company OA open Out list for notification menu. */
  async listOpenHandovers(claims: AccessClaims) {
    await assertCompanyTenantUser(this.ctx.store, claims);
    const rows = await this.ctx.store.listOpenOutsForCompany(claims.company_id);
    const items = [];
    for (const row of rows) {
      const vehicle = await this.ctx.store.findVehicle(row.vehicleId, claims.company_id);
      items.push({
        id: row.id,
        vehicle_id: row.vehicleId,
        company_id: row.companyId,
        type: "out" as const,
        status: "open" as const,
        driver: await this.ctx.driverRef(row.driverId),
        mileage: row.mileage,
        mileage_unit: row.mileageUnit,
        created_at: new Date(row.createdAt).toISOString(),
        vehicle: vehicle ? this.ctx.vehicleSummary(vehicle) : null,
      });
    }
    return { items };
  }

}
