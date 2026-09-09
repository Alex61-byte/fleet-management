import { AppError, errors } from "./errors.ts";
import { newId } from "./crypto.ts";
import type {
  AccessClaims,
  DriverDailyUsage,
  DriverTravelSelection,
  HandoverType,
  Vehicle,
  VehicleCustomExpiration,
  VehicleHandover,
  VehicleHandoverImage,
  VehicleSide,
} from "./domain.ts";
import {
  odometerUnitForCountry,
  parseOdometer,
  toVehicleJson,
  vehicleLabel,
  vehicleSidePath,
  withVehicleSidePath,
} from "./domain.ts";
import type { Store } from "./store.ts";
import { isUniqueViolation } from "./store.ts";
import {
  detectImage,
  handoverDamageObjectKey,
  MAX_HANDOVER_DAMAGE_IMAGES,
  MAX_VEHICLE_IMAGE_BYTES,
  sideObjectKey,
  type VehicleImageStorage,
} from "./vehicle-image-storage.ts";

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

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
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

function parseOptionalMileage(raw: unknown): number | null {
  if (raw === null) return null;
  if (typeof raw === "string" && raw.trim() === "") return null;
  try {
    return parseOdometer(raw);
  } catch {
    throw errors.validation("mileage must be a number ≥ 0 with at most 1 decimal");
  }
}

function assertCompanyUser(claims: AccessClaims) {
  if (claims.role === "driver") throw errors.forbidden();
}

function assertDriver(claims: AccessClaims) {
  if (claims.role !== "driver") throw errors.forbidden();
}

/** Company-kind Owner/Admin only — Individual tenants cannot use driver-ops / image history surfaces. */
async function assertCompanyTenantUser(store: Store, claims: AccessClaims) {
  assertCompanyUser(claims);
  const company = await store.findCompany(claims.company_id);
  if (company?.accountKind !== "company") throw errors.forbidden();
}

function requireText(value: string | undefined, field: string): string {
  const v = value?.trim() ?? "";
  if (!v) throw errors.validation(`${field} is required`);
  return v;
}

function applyWrite(target: Vehicle, body: VehicleWrite): Vehicle {
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

function emptyVehicle(companyId: string): Vehicle {
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

function toDriverVehicleJson(v: Vehicle) {
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

function toTravelJson(row: DriverTravelSelection, vehicle: Vehicle | undefined) {
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

export class FleetService {
  constructor(
    private readonly store: Store,
    private readonly images: VehicleImageStorage | null = null,
  ) {}

  private requireImages(): VehicleImageStorage {
    if (!this.images) throw errors.storageUnavailable();
    return this.images;
  }

  private async vehicleJson(vehicle: Vehicle) {
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

  async list(claims: AccessClaims, expiring?: boolean) {
    assertCompanyUser(claims);
    let items = await Promise.all(
      (await this.store.listVehicles(claims.company_id)).map((v) => this.vehicleJson(v)),
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
    await this.store.insertVehicle(vehicle);
    return this.vehicleJson(vehicle);
  }

  async get(claims: AccessClaims, id: string) {
    assertCompanyUser(claims);
    const vehicle = await this.store.findVehicle(id, claims.company_id);
    if (!vehicle) throw errors.notFound();
    return this.vehicleJson(vehicle);
  }

  async patch(claims: AccessClaims, id: string, body: VehicleWrite) {
    assertCompanyUser(claims);
    const existing = await this.store.findVehicle(id, claims.company_id);
    if (!existing) throw errors.notFound();
    const vehicle = applyWrite(existing, body);
    await this.store.updateVehicle(vehicle);
    return this.vehicleJson(vehicle);
  }

  async putSideImage(
    claims: AccessClaims,
    id: string,
    side: VehicleSide,
    bytes: Uint8Array,
  ) {
    await assertCompanyTenantUser(this.store, claims);
    if (bytes.byteLength === 0) throw errors.validation("file is required");
    if (bytes.byteLength > MAX_VEHICLE_IMAGE_BYTES) {
      throw errors.validation("Image must be 5 MB or smaller.");
    }
    const detected = detectImage(bytes);
    if (!detected) throw errors.validation("Upload an image file.");

    const existing = await this.store.findVehicle(id, claims.company_id);
    if (!existing) throw errors.notFound();

    const storage = this.requireImages();
    const path = sideObjectKey(existing.companyId, existing.id, side, detected.ext);
    const previous = vehicleSidePath(existing, side);

    try {
      await storage.upload(path, bytes, detected.mime);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw errors.storageUnavailable();
    }

    const updated = withVehicleSidePath(existing, side, path);
    await this.store.updateVehicle(updated);

    if (previous && previous !== path) {
      try {
        await storage.remove(previous);
      } catch {
        /* best-effort orphan cleanup on replace */
      }
    }

    return this.vehicleJson(updated);
  }

  /**
   * US-37 — delete one side’s object from storage and clear the DB path.
   * Storage delete runs first so we never claim empty while the blob still exists.
   * Idempotent when the side is already empty.
   */
  async clearSideImage(claims: AccessClaims, id: string, side: VehicleSide) {
    await assertCompanyTenantUser(this.store, claims);
    const existing = await this.store.findVehicle(id, claims.company_id);
    if (!existing) throw errors.notFound();

    const previous = vehicleSidePath(existing, side);
    if (!previous) return this.vehicleJson(existing);

    const storage = this.requireImages();
    try {
      await storage.remove(previous);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw errors.storageUnavailable();
    }

    const updated = withVehicleSidePath(existing, side, null);
    await this.store.updateVehicle(updated);
    return this.vehicleJson(updated);
  }

  async home(claims: AccessClaims) {
    assertCompanyUser(claims);
    const { drivers, vehicles } = await this.store.counts(claims.company_id);
    const expiring_vehicles = (
      await Promise.all(
        (await this.store.listVehicles(claims.company_id)).map((v) => this.vehicleJson(v)),
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

  async listDriverVehicles(claims: AccessClaims) {
    assertDriver(claims);
    const items = (await this.store.listVehicles(claims.company_id)).map(toDriverVehicleJson);
    return { items };
  }

  async getDriverTravel(claims: AccessClaims) {
    assertDriver(claims);
    const row = await this.store.findActiveDriverTravel(claims.sub);
    if (!row || row.companyId !== claims.company_id) return { travel: null };
    const vehicle = await this.store.findVehicle(row.vehicleId, claims.company_id);
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
    const vehicle = await this.store.findVehicle(vehicleId, claims.company_id);
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
    await this.store.withTransaction(async (tx) => {
      await tx.deactivateDriverTravel(claims.sub);
      await tx.insertDriverTravel(row);
    });
    return toTravelJson(row, vehicle);
  }

  private async driverRef(driverId: string | null) {
    if (!driverId) return null;
    const p = await this.store.findPrincipalById(driverId);
    if (!p) return null;
    return { id: p.id, email: p.email };
  }

  private vehicleSummary(vehicle: Vehicle) {
    return {
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      license_plate: vehicle.licensePlate,
      label: vehicleLabel(vehicle.make, vehicle.model),
    };
  }

  private async handoverListItem(row: VehicleHandover) {
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

  private async damageImagesJson(images: VehicleHandoverImage[], sign: boolean) {
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

  private async handoverDetail(
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

  async getDriverActiveHandover(claims: AccessClaims) {
    assertDriver(claims);
    const open = await this.store.findOpenOutForDriver(claims.sub);
    if (!open || open.companyId !== claims.company_id) return { handover: null };
    const vehicle = await this.store.findVehicle(open.vehicleId, claims.company_id);
    return {
      handover: {
        id: open.id,
        type: open.type,
        status: open.status,
        vehicle_id: open.vehicleId,
        mileage: open.mileage,
        mileage_unit: open.mileageUnit,
        created_at: new Date(open.createdAt).toISOString(),
        vehicle: vehicle ? this.vehicleSummary(vehicle) : null,
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

    const travel = await this.store.findActiveDriverTravel(claims.sub);
    if (!travel || travel.companyId !== claims.company_id) {
      throw errors.handoverNoActiveTravel();
    }
    const vehicle = await this.store.findVehicle(travel.vehicleId, claims.company_id);
    if (!vehicle) throw errors.handoverNoActiveTravel();

    const unit = odometerUnitForCountry(vehicle.countryOfRegistration);
    if (vehicle.mileage != null && mileage < vehicle.mileage) {
      throw errors.validation("Mileage cannot be lower than the vehicle’s current reading.");
    }

    let openOut: VehicleHandover | undefined;
    if (type === "out") {
      const vehicleOpen = await this.store.findOpenOutForVehicle(vehicle.id, claims.company_id);
      if (vehicleOpen) throw errors.handoverVehicleOpen();
      const driverOpen = await this.store.findOpenOutForDriver(claims.sub);
      if (driverOpen) throw errors.handoverDriverOpen();
    } else {
      openOut = await this.store.findOpenOutForVehicle(vehicle.id, claims.company_id);
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
      const storage = this.requireImages();
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
      await this.store.withTransaction(async (tx) => {
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
        await tx.updateVehicle({ ...vehicle, mileage });
      });
    } catch (err) {
      if (uploadedPaths.length && this.images) {
        for (const p of uploadedPaths) {
          try {
            await this.images.remove(p);
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

    return this.handoverDetail(row, { signImages: false, vehicle: { ...vehicle, mileage } });
  }

  async listVehicleHandovers(claims: AccessClaims, vehicleId: string) {
    await assertCompanyTenantUser(this.store, claims);
    const vehicle = await this.store.findVehicle(vehicleId, claims.company_id);
    if (!vehicle) throw errors.notFound();
    const rows = await this.store.listHandoversForVehicle(vehicleId, claims.company_id);
    const items = [];
    for (const row of rows) {
      items.push(await this.handoverListItem(row));
    }
    return { items };
  }

  async getVehicleHandover(claims: AccessClaims, vehicleId: string, handoverId: string) {
    await assertCompanyTenantUser(this.store, claims);
    const vehicle = await this.store.findVehicle(vehicleId, claims.company_id);
    if (!vehicle) throw errors.notFound();
    const row = await this.store.findHandover(handoverId, claims.company_id);
    if (!row || row.vehicleId !== vehicleId) throw errors.notFound();
    return this.handoverDetail(row, { signImages: true, vehicle });
  }

  private dailyUsageJson(row: DriverDailyUsage, vehicle: Vehicle | undefined) {
    return {
      id: row.id,
      vehicle_id: row.vehicleId,
      usage_date: row.usageDate,
      start_place: row.startPlace,
      start_distance: row.startDistance,
      end_place: row.endPlace,
      end_distance: row.endDistance,
      distance_unit: row.distanceUnit,
      start_time: row.startTime,
      end_time: row.endTime,
      created_at: new Date(row.createdAt).toISOString(),
      vehicle: vehicle ? this.vehicleSummary(vehicle) : null,
    };
  }

  async listDriverDailyUsage(claims: AccessClaims) {
    assertDriver(claims);
    const rows = await this.store.listDailyUsageForDriver(claims.sub, claims.company_id);
    const items = [];
    for (const row of rows) {
      const vehicle = await this.store.findVehicle(row.vehicleId, claims.company_id);
      items.push(this.dailyUsageJson(row, vehicle));
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

    const travel = await this.store.findActiveDriverTravel(claims.sub);
    if (!travel || travel.companyId !== claims.company_id) {
      throw errors.dailyUsageNoActiveTravel();
    }
    const vehicle = await this.store.findVehicle(travel.vehicleId, claims.company_id);
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
    await this.store.insertDailyUsage(row);
    return this.dailyUsageJson(row, vehicle);
  }
}
