import type { AccessClaims, VehicleSide } from "./domain.ts";
import type { VehicleWrite } from "./fleet/shared.ts";
import type { Store } from "./store.ts";
import type { Mailer } from "./mailer.ts";
import type { VehicleImageStorage } from "./vehicle-image-storage.ts";
import { FleetContext } from "./fleet/context.ts";
import { FleetVehicles } from "./fleet/vehicles.ts";
import { FleetDriver } from "./fleet/driver.ts";
import { FleetHandovers } from "./fleet/handovers.ts";
import { FleetDocuments } from "./fleet/documents.ts";
import { FleetReports } from "./fleet/reports.ts";

export type { VehicleWrite, VehicleCustomExpirationWrite } from "./fleet/shared.ts";
export { parseCustomExpirations } from "./fleet/shared.ts";

/**
 * Fleet domain facade — HTTP layer depends on this type only.
 * Implementation is split by subdomain under ./fleet/.
 */
export class FleetService {
  private readonly vehicles: FleetVehicles;
  private readonly driver: FleetDriver;
  private readonly handovers: FleetHandovers;
  private readonly documents: FleetDocuments;
  private readonly reports: FleetReports;

  constructor(
    store: Store,
    images: VehicleImageStorage | null = null,
    mailer: Mailer | null = null,
  ) {
    const ctx = new FleetContext(store, images, mailer);
    this.vehicles = new FleetVehicles(ctx);
    this.driver = new FleetDriver(ctx);
    this.handovers = new FleetHandovers(ctx);
    this.documents = new FleetDocuments(ctx);
    this.reports = new FleetReports(ctx);
  }

  list(claims: AccessClaims, expiring?: boolean) {
    return this.vehicles.list(claims, expiring);
  }

  create(claims: AccessClaims, body: VehicleWrite) {
    return this.vehicles.create(claims, body);
  }

  get(claims: AccessClaims, id: string) {
    return this.vehicles.get(claims, id);
  }

  patch(claims: AccessClaims, id: string, body: VehicleWrite) {
    return this.vehicles.patch(claims, id, body);
  }

  putSideImage(
    claims: AccessClaims,
    id: string,
    side: VehicleSide,
    bytes: Uint8Array,) {
    return this.vehicles.putSideImage(claims, id, side, bytes);
  }

  clearSideImage(claims: AccessClaims, id: string, side: VehicleSide) {
    return this.vehicles.clearSideImage(claims, id, side);
  }

  home(claims: AccessClaims) {
    return this.vehicles.home(claims);
  }

  listServiceDue(claims: AccessClaims) {
    return this.vehicles.listServiceDue(claims);
  }

  listDriverVehicles(claims: AccessClaims) {
    return this.driver.listDriverVehicles(claims);
  }

  getDriverTravel(claims: AccessClaims) {
    return this.driver.getDriverTravel(claims);
  }

  putDriverTravel(
    claims: AccessClaims,
    body: { vehicle_id?: string; odometer?: unknown },) {
    return this.driver.putDriverTravel(claims, body);
  }

  listDriverDailyUsage(claims: AccessClaims) {
    return this.driver.listDriverDailyUsage(claims);
  }

  createDriverDailyUsage(
    claims: AccessClaims,
    body: {
      usage_date?: unknown;
      start_place?: unknown;
      start_distance?: unknown;
      start_time?: unknown;
      end_place?: unknown;
      end_distance?: unknown;
      end_time?: unknown;
    },) {
    return this.driver.createDriverDailyUsage(claims, body);
  }

  getDriverActiveHandover(claims: AccessClaims) {
    return this.handovers.getDriverActiveHandover(claims);
  }

  createDriverHandover(
    claims: AccessClaims,
    input: {
      type?: string;
      mileage?: unknown;
      next_service_days?: unknown;
      next_service_distance?: unknown;
      damages_text?: unknown;
      damageFiles?: Uint8Array[];
    },) {
    return this.handovers.createDriverHandover(claims, input);
  }

  listVehicleHandovers(claims: AccessClaims, vehicleId: string) {
    return this.handovers.listVehicleHandovers(claims, vehicleId);
  }

  getVehicleHandover(claims: AccessClaims, vehicleId: string, handoverId: string) {
    return this.handovers.getVehicleHandover(claims, vehicleId, handoverId);
  }

  uploadComplianceDocument(
    claims: AccessClaims,
    vehicleId: string,
    input: { doc_type?: unknown; label?: unknown; bytes: Uint8Array },) {
    return this.documents.uploadComplianceDocument(claims, vehicleId, input);
  }

  listComplianceDocuments(claims: AccessClaims, vehicleId: string) {
    return this.documents.listComplianceDocuments(claims, vehicleId);
  }

  deleteComplianceDocument(claims: AccessClaims, vehicleId: string, docId: string) {
    return this.documents.deleteComplianceDocument(claims, vehicleId, docId);
  }

  listVehicleIssues(claims: AccessClaims, vehicleId: string) {
    return this.documents.listVehicleIssues(claims, vehicleId);
  }

  createVehicleIssue(
    claims: AccessClaims,
    vehicleId: string,
    body: { title?: unknown; description?: unknown },) {
    return this.documents.createVehicleIssue(claims, vehicleId, body);
  }

  closeVehicleIssue(claims: AccessClaims, vehicleId: string, issueId: string) {
    return this.documents.closeVehicleIssue(claims, vehicleId, issueId);
  }

  listCompanyDailyUsage(
    claims: AccessClaims,
    opts?: { from?: string; to?: string },) {
    return this.reports.listCompanyDailyUsage(claims, opts);
  }

  companyDailyUsageCsv(
    claims: AccessClaims,
    opts?: { from?: string; to?: string },) {
    return this.reports.companyDailyUsageCsv(claims, opts);
  }

  sendComplianceDigestsForCompany(claims: AccessClaims) {
    return this.reports.sendComplianceDigestsForCompany(claims);
  }
}
