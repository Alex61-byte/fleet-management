import { errors } from "./errors.ts";
import { newId } from "./crypto.ts";
import type { AccessClaims, DriverTravelSelection, Vehicle } from "./domain.ts";
import {
  odometerUnitForCountry,
  parseOdometer,
  toVehicleJson,
  vehicleLabel,
} from "./domain.ts";
import type { Store } from "./store.ts";

export type VehicleWrite = {
  make?: string;
  model?: string;
  license_plate?: string;
  country_of_registration?: string | null;
  insurance_on?: string | null;
  inspection_on?: string | null;
  road_tax_on?: string | null;
  registration_on?: string | null;
};

function assertCompanyUser(claims: AccessClaims) {
  if (claims.role === "driver") throw errors.forbidden();
}

function assertDriver(claims: AccessClaims) {
  if (claims.role !== "driver") throw errors.forbidden();
}

function requireText(value: string | undefined, field: string): string {
  const v = value?.trim() ?? "";
  if (!v) throw errors.validation(`${field} is required`);
  return v;
}

function applyWrite(target: Vehicle, body: VehicleWrite): Vehicle {
  return {
    ...target,
    make: body.make !== undefined ? body.make.trim() : target.make,
    model: body.model !== undefined ? body.model.trim() : target.model,
    licensePlate: body.license_plate !== undefined ? body.license_plate.trim() : target.licensePlate,
    countryOfRegistration:
      body.country_of_registration === undefined
        ? target.countryOfRegistration
        : body.country_of_registration,
    insuranceOn: body.insurance_on === undefined ? target.insuranceOn : body.insurance_on,
    inspectionOn: body.inspection_on === undefined ? target.inspectionOn : body.inspection_on,
    roadTaxOn: body.road_tax_on === undefined ? target.roadTaxOn : body.road_tax_on,
    registrationOn: body.registration_on === undefined ? target.registrationOn : body.registration_on,
  };
}

function toDriverVehicleJson(v: Vehicle) {
  return {
    id: v.id,
    make: v.make,
    model: v.model,
    license_plate: v.licensePlate,
    country_of_registration: v.countryOfRegistration,
    odometer_unit: odometerUnitForCountry(v.countryOfRegistration),
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
  constructor(private readonly store: Store) {}

  async list(claims: AccessClaims, expiring?: boolean) {
    assertCompanyUser(claims);
    let items = (await this.store.listVehicles(claims.company_id)).map((v) => toVehicleJson(v));
    if (expiring) items = items.filter((v) => v.warnings.length > 0);
    return { items };
  }

  async create(claims: AccessClaims, body: VehicleWrite) {
    assertCompanyUser(claims);
    const make = requireText(body.make, "make");
    const model = requireText(body.model, "model");
    const licensePlate = requireText(body.license_plate, "license_plate");
    const vehicle: Vehicle = applyWrite(
      {
        id: newId(),
        companyId: claims.company_id,
        make,
        model,
        licensePlate,
        countryOfRegistration: null,
        insuranceOn: null,
        inspectionOn: null,
        roadTaxOn: null,
        registrationOn: null,
      },
      { ...body, make, model, license_plate: licensePlate },
    );
    await this.store.insertVehicle(vehicle);
    return toVehicleJson(vehicle);
  }

  async get(claims: AccessClaims, id: string) {
    assertCompanyUser(claims);
    const vehicle = await this.store.findVehicle(id, claims.company_id);
    if (!vehicle) throw errors.notFound();
    return toVehicleJson(vehicle);
  }

  async patch(claims: AccessClaims, id: string, body: VehicleWrite) {
    assertCompanyUser(claims);
    const existing = await this.store.findVehicle(id, claims.company_id);
    if (!existing) throw errors.notFound();
    const vehicle = applyWrite(existing, body);
    await this.store.updateVehicle(vehicle);
    return toVehicleJson(vehicle);
  }

  async home(claims: AccessClaims) {
    assertCompanyUser(claims);
    const { drivers, vehicles } = await this.store.counts(claims.company_id);
    const expiring_vehicles = (await this.store.listVehicles(claims.company_id))
      .map((v) => toVehicleJson(v))
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
}
