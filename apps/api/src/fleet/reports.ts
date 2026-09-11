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

export class FleetReports {
  constructor(private readonly ctx: FleetContext) {}
  async listCompanyDailyUsage(
    claims: AccessClaims,
    opts?: { from?: string; to?: string },
  ) {
    await assertCompanyTenantUser(this.ctx.store, claims);
    const from = opts?.from?.trim();
    const to = opts?.to?.trim();
    if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) {
      throw errors.validation("from must be YYYY-MM-DD");
    }
    if (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      throw errors.validation("to must be YYYY-MM-DD");
    }
    if (from && to && from > to) {
      throw errors.validation("from must be on or before to");
    }

    const rows = await this.ctx.store.listDailyUsageForCompany(claims.company_id, {
      from: from || undefined,
      to: to || undefined,
    });
    const items = [];
    for (const row of rows) {
      const vehicle = await this.ctx.store.findVehicle(row.vehicleId, claims.company_id);
      const driver = await this.ctx.store.findPrincipalById(row.driverId);
      items.push({
        id: row.id,
        company_id: row.companyId,
        driver_id: row.driverId,
        driver_email: driver?.email ?? null,
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
        vehicle: vehicle ? this.ctx.vehicleSummary(vehicle) : null,
      });
    }
    return { items };
  }

  async companyDailyUsageCsv(
    claims: AccessClaims,
    opts?: { from?: string; to?: string },
  ): Promise<string> {
    const { items } = await this.listCompanyDailyUsage(claims, opts);
    const header = [
      "usage_date",
      "status",
      "driver_email",
      "vehicle_label",
      "license_plate",
      "start_place",
      "end_place",
      "start_distance",
      "end_distance",
      "distance_unit",
      "start_time",
      "end_time",
      "refuel_amount",
      "refuel_amount_unit",
      "refuel_at_mileage",
      "created_at",
      "closed_at",
    ];
    const escape = (v: string) => {
      if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
      return v;
    };
    const lines = [header.join(",")];
    for (const row of items) {
      const label = row.vehicle
        ? String((row.vehicle as { label?: string }).label ?? "")
        : "";
      const plate = row.vehicle
        ? String((row.vehicle as { license_plate?: string }).license_plate ?? "")
        : "";
      lines.push(
        [
          row.usage_date,
          row.status,
          row.driver_email ?? "",
          label,
          plate,
          row.start_place,
          row.end_place ?? "",
          String(row.start_distance),
          row.end_distance == null ? "" : String(row.end_distance),
          row.distance_unit,
          row.start_time,
          row.end_time ?? "",
          row.refuel_amount == null ? "" : String(row.refuel_amount),
          row.refuel_amount_unit ?? "",
          row.refuel_at_mileage == null ? "" : String(row.refuel_at_mileage),
          row.created_at,
          row.closed_at ?? "",
        ]
          .map((c) => escape(String(c)))
          .join(","),
      );
    }
    return lines.join("\n") + "\n";
  }

  async sendComplianceDigestsForCompany(claims: AccessClaims) {
    assertCompanyUser(claims);
    const vehicles = await this.ctx.store.listVehicles(claims.company_id);
    const digestItems: Array<{
      vehicleLabel: string;
      licensePlate: string;
      field: string;
      state: "expired" | "due_soon";
    }> = [];
    for (const vehicle of vehicles) {
      const warnings = computeWarnings(vehicle);
      for (const w of warnings) {
        digestItems.push({
          vehicleLabel: vehicleLabel(vehicle.make, vehicle.model),
          licensePlate: vehicle.licensePlate,
          field: this.ctx.warningFieldLabel(w.field, vehicle),
          state: w.state,
        });
      }
    }
    digestItems.sort((a, b) => {
      if (a.state !== b.state) return a.state === "expired" ? -1 : 1;
      return a.vehicleLabel.localeCompare(b.vehicleLabel);
    });
    const capped = digestItems.slice(0, 50);
    if (capped.length === 0) {
      return { sent: 0, skipped: 0, reason: "no_warnings" as const };
    }

    const sentOn = utcToday();
    const recipients = await this.ctx.store.listOwnerAdminPrincipals(claims.company_id);
    const mailer = this.ctx.mailer;
    let sent = 0;
    let skipped = 0;
    for (const principal of recipients) {
      if (!principal.email || !principal.loginEnabled) {
        skipped += 1;
        continue;
      }
      if (await this.ctx.store.hasComplianceDigestSend(claims.company_id, principal.id, sentOn)) {
        skipped += 1;
        continue;
      }
      let ok = false;
      if (mailer) {
        ok = await mailer.sendComplianceDigest({
          to: principal.email,
          items: capped,
          sentOn,
        });
      }
      if (ok) {
        await this.ctx.store.recordComplianceDigestSend(claims.company_id, principal.id, sentOn);
        sent += 1;
      } else {
        skipped += 1;
      }
    }
    return { sent, skipped, reason: "ok" as const, item_count: capped.length };
  }
}
