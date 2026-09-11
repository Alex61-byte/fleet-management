import { errors } from "../errors.ts";
import type { RouteContext } from "./context.ts";

export function registerDriverRoutes(ctx: RouteContext): void {
  const { app, fleet, requireSession, sendList } = ctx;
  app.get("/v1/driver/vehicles", { preHandler: requireSession }, async (req, reply) => {
    const body = await fleet.listDriverVehicles(req.claims!);
    const q = req.query as { limit?: string; cursor?: string };
    return sendList(req, reply, req.claims!.company_id, "driver-vehicles", body.items, q);
  });

  app.get("/v1/driver/travel", { preHandler: requireSession }, async (req) => {
    return fleet.getDriverTravel(req.claims!);
  });

  app.put(
    "/v1/driver/travel",
    {
      preHandler: requireSession,
      schema: {
        body: {
          type: "object",
          required: ["vehicle_id", "odometer"],
          additionalProperties: false,
          properties: {
            vehicle_id: { type: "string", minLength: 1 },
            odometer: {
              anyOf: [{ type: "number" }, { type: "string", minLength: 1 }],
            },
          },
        },
      },
    },
    async (req) => {
      return fleet.putDriverTravel(req.claims!, req.body as { vehicle_id?: string; odometer?: unknown });
    },
  );

  app.get("/v1/driver/handovers/active", { preHandler: requireSession }, async (req) => {
    return fleet.getDriverActiveHandover(req.claims!);
  });

  app.post("/v1/driver/handovers", { preHandler: requireSession }, async (req, reply) => {
    const fields: Record<string, string> = {};
    const damageFiles: Uint8Array[] = [];
    const parts = req.parts();
    for await (const part of parts) {
      if (part.type === "file") {
        const name = part.fieldname;
        if (name !== "damages" && name !== "damages[]") {
          throw errors.validation("Unexpected file field.");
        }
        const buffer = await part.toBuffer();
        damageFiles.push(new Uint8Array(buffer));
      } else {
        fields[part.fieldname] = String(part.value ?? "");
      }
    }
    const created = await fleet.createDriverHandover(req.claims!, {
      type: fields.type,
      mileage: fields.mileage,
      next_service_days: fields.next_service_days,
      next_service_distance: fields.next_service_distance,
      damages_text: fields.damages_text,
      damageFiles,
    });
    return reply.code(201).send(created);
  });

  app.get("/v1/driver/daily-usage", { preHandler: requireSession }, async (req) => {
    return fleet.listDriverDailyUsage(req.claims!);
  });

  app.post(
    "/v1/driver/daily-usage",
    {
      preHandler: requireSession,
      schema: {
        body: {
          type: "object",
          required: [
            "usage_date",
            "start_place",
            "start_distance",
            "start_time",
            "end_place",
            "end_distance",
            "end_time",
          ],
          additionalProperties: false,
          properties: {
            usage_date: { type: "string", minLength: 1 },
            start_place: { type: "string", minLength: 1 },
            start_distance: {
              anyOf: [{ type: "number" }, { type: "string", minLength: 1 }],
            },
            start_time: { type: "string", minLength: 1 },
            end_place: { type: "string", minLength: 1 },
            end_distance: {
              anyOf: [{ type: "number" }, { type: "string", minLength: 1 }],
            },
            end_time: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (req, reply) => {
      const created = await fleet.createDriverDailyUsage(
        req.claims!,
        req.body as {
          usage_date?: unknown;
          start_place?: unknown;
          start_distance?: unknown;
          start_time?: unknown;
          end_place?: unknown;
          end_distance?: unknown;
          end_time?: unknown;
        },
      );
      return reply.code(201).send(created);
    },
  );

  // US-93/94 — compliance document vault
}
