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

/** Shared store/images/mailer + helpers used by fleet ops modules. */
export class FleetContext {
  constructor(
    readonly store: Store,
    readonly images: VehicleImageStorage | null = null,
    readonly mailer: Mailer | null = null,
  ) {}

  requireImages(): VehicleImageStorage {
    if (!this.images) throw errors.storageUnavailable();
    return this.images;
  }

  async vehicleJson(vehicle: Vehicle) {
    const storage = this.images;
    return toVehicleJson(
      vehicle,
      undefined,
      storage
        ? async (path) => {
            try {
              return await storage.signedUrl(path);
            } catch {
              throw errors.storageUnavailable();
            }
          }
        : undefined,
    );
  }

  async driverRef(driverId: string | null) {
    if (!driverId) return null;
    const p = await this.store.findPrincipalById(driverId);
    if (!p) return null;
    return { id: p.id, email: p.email };
  }

  vehicleSummary(vehicle: Vehicle) {
    return {
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      license_plate: vehicle.licensePlate,
      label: vehicleLabel(vehicle.make, vehicle.model),
    };
  }

  async handoverListItem(row: VehicleHandover) {
    const damage_image_count = await this.store.countHandoverImages(row.id);
    return {
      id: row.id,
      vehicle_id: row.vehicleId,
      company_id: row.companyId,
      type: row.type,
      status: row.status,
      handover_out_id: row.handoverOutId,
      driver: await this.driverRef(row.driverId),
      mileage: row.mileage,
      mileage_unit: row.mileageUnit,
      next_service_days: row.nextServiceDays,
      next_service_distance: row.nextServiceDistance,
      next_service_distance_unit: row.nextServiceDistanceUnit,
      damages_text: row.damagesText,
      damage_image_count,
      created_at: new Date(row.createdAt).toISOString(),
      closed_at: row.closedAt ? new Date(row.closedAt).toISOString() : null,
      voided_at: row.voidedAt ? new Date(row.voidedAt).toISOString() : null,
    };
  }

  async damageImagesJson(images: VehicleHandoverImage[], sign: boolean) {
    const out: Array<{ id: string; path: string; url: string; sort_order: number }> = [];
    for (const img of images) {
      let url = "";
      if (sign) {
        const storage = this.requireImages();
        try {
          url = await storage.signedUrl(img.storagePath);
        } catch (err) {
          if (err instanceof AppError) throw err;
          throw errors.storageUnavailable();
        }
      }
      out.push({
        id: img.id,
        path: img.storagePath,
        url,
        sort_order: img.sortOrder,
      });
    }
    return out;
  }

  async handoverDetail(
    row: VehicleHandover,
    opts: { signImages: boolean; vehicle?: Vehicle },
  ) {
    const base = await this.handoverListItem(row);
    const images = await this.store.listHandoverImages(row.id);
    let vehicle = opts.vehicle;
    if (!vehicle) {
      vehicle = await this.store.findVehicle(row.vehicleId, row.companyId);
    }
    let paired_out: {
      id: string;
      mileage: number;
      mileage_unit: string;
      created_at: string;
    } | null = null;
    if (row.handoverOutId) {
      const out = await this.store.findHandover(row.handoverOutId, row.companyId);
      if (out) {
        paired_out = {
          id: out.id,
          mileage: out.mileage,
          mileage_unit: out.mileageUnit,
          created_at: new Date(out.createdAt).toISOString(),
        };
      }
    }
    return {
      ...base,
      damage_images: await this.damageImagesJson(images, opts.signImages),
      vehicle: vehicle ? this.vehicleSummary(vehicle) : null,
      paired_out,
    };
  }

  dailyUsageJson(row: DriverDailyUsage, vehicle: Vehicle | undefined) {
    return {
      id: row.id,
      vehicle_id: row.vehicleId,
      usage_date: row.usageDate,
      status: row.status,
      start_place: row.startPlace,
      start_distance: row.startDistance,
      end_place: row.endPlace,
      end_distance: row.endDistance,
      distance_unit: row.distanceUnit,
      start_time: row.startTime,
      end_time: row.endTime,
      refuel_amount: row.refuelAmount,
      refuel_amount_unit: row.refuelAmountUnit,
      refuel_at_mileage: row.refuelAtMileage,
      created_at: new Date(row.createdAt).toISOString(),
      closed_at: row.closedAt != null ? new Date(row.closedAt).toISOString() : null,
      vehicle: vehicle ? this.vehicleSummary(vehicle) : null,
    };
  }

  complianceDocJson(row: VehicleComplianceDocument, url: string) {
    return {
      id: row.id,
      vehicle_id: row.vehicleId,
      company_id: row.companyId,
      doc_type: row.docType,
      label: row.label,
      content_type: row.contentType,
      byte_size: row.byteSize,
      path: row.storagePath,
      url,
      created_at: new Date(row.createdAt).toISOString(),
    };
  }

  issueJson(row: VehicleIssue) {
    return {
      id: row.id,
      vehicle_id: row.vehicleId,
      company_id: row.companyId,
      created_by_principal_id: row.createdByPrincipalId,
      source: row.source,
      handover_id: row.handoverId,
      title: row.title,
      description: row.description,
      status: row.status,
      created_at: new Date(row.createdAt).toISOString(),
      closed_at: row.closedAt ? new Date(row.closedAt).toISOString() : null,
    };
  }

  parseDocType(raw: unknown): ComplianceDocType {
    const v = typeof raw === "string" ? raw.trim() : "";
    const allowed: ComplianceDocType[] = [
      "insurance",
      "inspection",
      "road_tax",
      "registration",
      "other",
    ];
    if (!allowed.includes(v as ComplianceDocType)) {
      throw errors.validation(
        "doc_type must be insurance, inspection, road_tax, registration, or other",
      );
    }
    return v as ComplianceDocType;
  }

  warningFieldLabel(field: Warning["field"], vehicle: Vehicle): string {
    if (field.startsWith("custom:")) {
      const id = field.slice("custom:".length);
      const row = vehicle.customExpirations.find((c) => c.id === id);
      return row?.label ?? "Custom date";
    }
    switch (field) {
      case "insurance_on":
        return "Insurance";
      case "inspection_on":
        return "Inspection";
      case "road_tax_on":
        return "Road tax";
      case "registration_on":
        return "Registration";
      default:
        return String(field);
    }
  }

}
