import { errors } from "../errors.ts";
import { parseVehicleSide } from "../vehicle-image-storage.ts";
import { vehicleWrite, type VehicleWriteBody } from "./schemas.ts";
import type { RouteContext } from "./context.ts";

export function registerFleetRoutes(ctx: RouteContext): void {
  const { app, fleet, requireSession, bumpTenant, sendList, sendHome } = ctx;
  app.get("/v1/vehicles", { preHandler: requireSession }, async (req, reply) => {
    const q = req.query as { expiring?: string; limit?: string; cursor?: string };
    const body = await fleet.list(req.claims!, q.expiring === "true");
    const listKey = q.expiring === "true" ? "vehicles:expiring" : "vehicles";
    return sendList(req, reply, req.claims!.company_id, listKey, body.items, q);
  });

  app.post(
    "/v1/vehicles",
    { preHandler: requireSession, schema: { body: vehicleWrite } },
    async (req, reply) => {
      const created = await fleet.create(req.claims!, req.body as VehicleWriteBody);
      bumpTenant(req.claims!.company_id);
      return reply.status(201).send(created);
    },
  );

  app.get("/v1/vehicles/:id", { preHandler: requireSession }, async (req) => {
    const { id } = req.params as { id: string };
    return fleet.get(req.claims!, id);
  });

  app.patch(
    "/v1/vehicles/:id",
    { preHandler: requireSession, schema: { body: vehicleWrite } },
    async (req) => {
      const { id } = req.params as { id: string };
      const patched = await fleet.patch(req.claims!, id, req.body as VehicleWriteBody);
      bumpTenant(req.claims!.company_id);
      return patched;
    },
  );

  app.put("/v1/vehicles/:id/sides/:side", { preHandler: requireSession }, async (req) => {
    const { id, side: sideRaw } = req.params as { id: string; side: string };
    const side = parseVehicleSide(sideRaw);
    const file = await req.file();
    if (!file) throw errors.validation("file is required");
    const buffer = await file.toBuffer();
    const updated = await fleet.putSideImage(req.claims!, id, side, new Uint8Array(buffer));
    bumpTenant(req.claims!.company_id);
    return updated;
  });

  app.delete("/v1/vehicles/:id/sides/:side", { preHandler: requireSession }, async (req) => {
    const { id, side: sideRaw } = req.params as { id: string; side: string };
    const side = parseVehicleSide(sideRaw);
    const cleared = await fleet.clearSideImage(req.claims!, id, side);
    bumpTenant(req.claims!.company_id);
    return cleared;
  });

  app.get("/v1/home", { preHandler: requireSession }, async (req, reply) => {
    const body = await fleet.home(req.claims!);
    return sendHome(req, reply, req.claims!.company_id, body);
  });

  app.get("/v1/vehicles/:id/handovers", { preHandler: requireSession }, async (req) => {
    const { id } = req.params as { id: string };
    return fleet.listVehicleHandovers(req.claims!, id);
  });

  app.get("/v1/vehicles/:id/handovers/:handoverId", { preHandler: requireSession }, async (req) => {
    const { id, handoverId } = req.params as { id: string; handoverId: string };
    return fleet.getVehicleHandover(req.claims!, id, handoverId);
  });

  // US-111 — Company OA open Outs for notification menu
  app.get("/v1/handovers/open", { preHandler: requireSession }, async (req) => {
    return fleet.listOpenHandovers(req.claims!);
  });

  app.get("/v1/vehicles/:id/documents", { preHandler: requireSession }, async (req) => {
    const { id } = req.params as { id: string };
    return fleet.listComplianceDocuments(req.claims!, id);
  });

  app.post("/v1/vehicles/:id/documents", { preHandler: requireSession }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const fields: Record<string, string> = {};
    let fileBytes: Uint8Array | null = null;
    const parts = req.parts();
    for await (const part of parts) {
      if (part.type === "file") {
        if (part.fieldname !== "file") throw errors.validation("Unexpected file field.");
        fileBytes = new Uint8Array(await part.toBuffer());
      } else {
        fields[part.fieldname] = String(part.value ?? "");
      }
    }
    if (!fileBytes) throw errors.validation("file is required");
    const created = await fleet.uploadComplianceDocument(req.claims!, id, {
      doc_type: fields.doc_type,
      label: fields.label,
      bytes: fileBytes,
    });
    bumpTenant(req.claims!.company_id);
    return reply.code(201).send(created);
  });

  app.delete(
    "/v1/vehicles/:id/documents/:docId",
    { preHandler: requireSession },
    async (req, reply) => {
      const { id, docId } = req.params as { id: string; docId: string };
      await fleet.deleteComplianceDocument(req.claims!, id, docId);
      bumpTenant(req.claims!.company_id);
      return reply.code(204).send();
    },
  );

  // US-96 — Owner/Admin company daily usage report
  app.get("/v1/reports/daily-usage", { preHandler: requireSession }, async (req) => {
    const q = req.query as { from?: string; to?: string };
    return fleet.listCompanyDailyUsage(req.claims!, { from: q.from, to: q.to });
  });

  app.get("/v1/reports/daily-usage.csv", { preHandler: requireSession }, async (req, reply) => {
    const q = req.query as { from?: string; to?: string };
    const csv = await fleet.companyDailyUsageCsv(req.claims!, { from: q.from, to: q.to });
    return reply
      .header("content-type", "text/csv; charset=utf-8")
      .header("content-disposition", 'attachment; filename="daily-usage.csv"')
      .send(csv);
  });

  // US-97 — service-due board
  app.get("/v1/service-due", { preHandler: requireSession }, async (req) => {
    return fleet.listServiceDue(req.claims!);
  });

  // US-98 — vehicle issues
  app.get("/v1/vehicles/:id/issues", { preHandler: requireSession }, async (req) => {
    const { id } = req.params as { id: string };
    return fleet.listVehicleIssues(req.claims!, id);
  });

  app.post(
    "/v1/vehicles/:id/issues",
    {
      preHandler: requireSession,
      schema: {
        body: {
          type: "object",
          required: ["title"],
          additionalProperties: false,
          properties: {
            title: { type: "string", minLength: 1 },
            description: { type: "string" },
          },
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const created = await fleet.createVehicleIssue(
        req.claims!,
        id,
        req.body as { title?: unknown; description?: unknown },
      );
      bumpTenant(req.claims!.company_id);
      return reply.code(201).send(created);
    },
  );

  app.post(
    "/v1/vehicles/:id/issues/:issueId/close",
    { preHandler: requireSession },
    async (req) => {
      const { id, issueId } = req.params as { id: string; issueId: string };
      const closed = await fleet.closeVehicleIssue(req.claims!, id, issueId);
      bumpTenant(req.claims!.company_id);
      return closed;
    },
  );

  // US-95 — compliance digest trigger (Owner/Admin, tenant-scoped)
  app.post("/v1/compliance-digest/send", { preHandler: requireSession }, async (req) => {
    return fleet.sendComplianceDigestsForCompany(req.claims!);
  });

}
