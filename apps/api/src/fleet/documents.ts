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

export class FleetDocuments {
  constructor(private readonly ctx: FleetContext) {}
  async uploadComplianceDocument(
    claims: AccessClaims,
    vehicleId: string,
    input: { doc_type?: unknown; label?: unknown; bytes: Uint8Array },
  ) {
    assertCompanyUser(claims);
    const vehicle = await this.ctx.store.findVehicle(vehicleId, claims.company_id);
    if (!vehicle) throw errors.notFound();

    const bytes = input.bytes;
    if (bytes.byteLength === 0) throw errors.validation("file is required");
    if (bytes.byteLength > MAX_COMPLIANCE_DOC_BYTES) {
      throw errors.validation("Document must be 10 MB or smaller.");
    }
    const detected = detectComplianceUpload(bytes);
    if (!detected) throw errors.validation("Upload a PDF or image file.");

    const count = await this.ctx.store.countComplianceDocuments(vehicleId, claims.company_id);
    if (count >= MAX_COMPLIANCE_DOCS_PER_VEHICLE) {
      throw errors.validation("This vehicle already has the maximum number of documents.");
    }

    const docType = this.ctx.parseDocType(input.doc_type);
    let label = typeof input.label === "string" ? input.label.trim() : "";
    if (label.length > 120) throw errors.validation("label must be 120 characters or fewer");

    const storage = this.ctx.requireImages();
    const id = newId();
    const path = complianceDocObjectKey(claims.company_id, vehicleId, id, detected.ext);
    try {
      await storage.upload(path, bytes, detected.mime);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw errors.storageUnavailable();
    }

    const row: VehicleComplianceDocument = {
      id,
      companyId: claims.company_id,
      vehicleId,
      docType,
      label,
      storagePath: path,
      contentType: detected.mime,
      byteSize: bytes.byteLength,
      createdAt: Date.now(),
    };
    try {
      await this.ctx.store.insertComplianceDocument(row);
    } catch (err) {
      try {
        await storage.remove(path);
      } catch {
        /* best-effort */
      }
      throw err;
    }

    let url = "";
    try {
      url = await storage.signedUrl(path);
    } catch {
      url = "";
    }
    return this.ctx.complianceDocJson(row, url);
  }

  async listComplianceDocuments(claims: AccessClaims, vehicleId: string) {
    assertCompanyUser(claims);
    const vehicle = await this.ctx.store.findVehicle(vehicleId, claims.company_id);
    if (!vehicle) throw errors.notFound();
    const rows = await this.ctx.store.listComplianceDocuments(vehicleId, claims.company_id);
    const storage = this.ctx.images;
    const items = [];
    for (const row of rows) {
      let url = "";
      if (storage) {
        try {
          url = await storage.signedUrl(row.storagePath);
        } catch {
          url = "";
        }
      }
      items.push(this.ctx.complianceDocJson(row, url));
    }
    return { items };
  }

  async deleteComplianceDocument(claims: AccessClaims, vehicleId: string, docId: string) {
    assertCompanyUser(claims);
    const vehicle = await this.ctx.store.findVehicle(vehicleId, claims.company_id);
    if (!vehicle) throw errors.notFound();
    const row = await this.ctx.store.findComplianceDocument(docId, claims.company_id);
    if (!row || row.vehicleId !== vehicleId) throw errors.notFound();
    if (this.ctx.images) {
      try {
        await this.ctx.images.remove(row.storagePath);
      } catch {
        /* best-effort */
      }
    }
    await this.ctx.store.deleteComplianceDocument(docId, claims.company_id);
  }

  async listVehicleIssues(claims: AccessClaims, vehicleId: string) {
    if (claims.role === "driver") {
      const travel = await this.ctx.store.findActiveDriverTravel(claims.sub);
      if (!travel || travel.companyId !== claims.company_id || travel.vehicleId !== vehicleId) {
        throw errors.forbidden();
      }
    } else {
      assertCompanyUser(claims);
    }
    const vehicle = await this.ctx.store.findVehicle(vehicleId, claims.company_id);
    if (!vehicle) throw errors.notFound();
    const rows = await this.ctx.store.listIssuesForVehicle(vehicleId, claims.company_id);
    return { items: rows.map((r) => this.ctx.issueJson(r)) };
  }

  async createVehicleIssue(
    claims: AccessClaims,
    vehicleId: string,
    body: { title?: unknown; description?: unknown },
  ) {
    const vehicle = await this.ctx.store.findVehicle(vehicleId, claims.company_id);
    if (!vehicle) throw errors.notFound();

    if (claims.role === "driver") {
      const travel = await this.ctx.store.findActiveDriverTravel(claims.sub);
      if (!travel || travel.companyId !== claims.company_id || travel.vehicleId !== vehicleId) {
        throw errors.forbidden();
      }
    } else {
      assertCompanyUser(claims);
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) throw errors.validation("title is required");
    if (title.length > 200) throw errors.validation("title must be 200 characters or fewer");
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    if (description.length > 2000) {
      throw errors.validation("description must be 2000 characters or fewer");
    }

    const row: VehicleIssue = {
      id: newId(),
      companyId: claims.company_id,
      vehicleId,
      createdByPrincipalId: claims.sub,
      source: "manual",
      handoverId: null,
      title,
      description,
      status: "open",
      createdAt: Date.now(),
      closedAt: null,
    };
    await this.ctx.store.insertIssue(row);
    return this.ctx.issueJson(row);
  }

  async closeVehicleIssue(claims: AccessClaims, vehicleId: string, issueId: string) {
    assertCompanyUser(claims);
    const vehicle = await this.ctx.store.findVehicle(vehicleId, claims.company_id);
    if (!vehicle) throw errors.notFound();
    const row = await this.ctx.store.findIssue(issueId, claims.company_id);
    if (!row || row.vehicleId !== vehicleId) throw errors.notFound();
    if (row.status === "closed") return this.ctx.issueJson(row);
    const updated: VehicleIssue = {
      ...row,
      status: "closed",
      closedAt: Date.now(),
    };
    await this.ctx.store.updateIssue(updated);
    return this.ctx.issueJson(updated);
  }

}
