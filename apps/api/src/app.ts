import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import sensible from "@fastify/sensible";
import { AppError, errors } from "./errors.ts";
import { normalizeEmail, type AccessClaims, type Client } from "./domain.ts";
import { FleetService } from "./fleet-service.ts";
import { IdentityService } from "./identity-service.ts";
import type { Store } from "./store.ts";
import { mailerFromEnv, type Mailer } from "./mailer.ts";
import {
  MAX_VEHICLE_IMAGE_BYTES,
  parseVehicleSide,
  vehicleImageStorageFromEnvDetailed,
  type VehicleImageStorage,
} from "./vehicle-image-storage.ts";
import {
  TenantRevisionRegistry,
  ifNoneMatch,
  parsePageParams,
  slicePage,
  type ListKey,
} from "./tenant-revision.ts";

/** Trim+lower body.email before AJV `format: "email"` so padded input is not validation_error. */
function normalizeBodyEmail(req: FastifyRequest, _reply: FastifyReply, done: (err?: Error) => void) {
  const body = req.body;
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const record = body as Record<string, unknown>;
    if (typeof record.email === "string") {
      record.email = normalizeEmail(record.email);
    }
  }
  done();
}

const registerBody = {
  type: "object",
  required: ["email", "password", "registration_number", "vat_number", "address"],
  additionalProperties: false,
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 1 },
    registration_number: { type: "string", minLength: 1, maxLength: 64 },
    vat_number: { type: "string", minLength: 1, maxLength: 64 },
    address: { type: "string", minLength: 1, maxLength: 500 },
  },
} as const;

const emailPassword = {
  type: "object",
  required: ["email", "password"],
  additionalProperties: false,
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 1 },
  },
} as const;

const registerIndividualBody = {
  type: "object",
  required: ["email", "password"],
  additionalProperties: false,
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 1 },
  },
} as const;

const loginBody = {
  type: "object",
  required: ["email", "password", "client"],
  additionalProperties: false,
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 1 },
    client: { type: "string", enum: ["web", "mobile"] },
  },
} as const;

const vehicleWrite = {
  type: "object",
  additionalProperties: false,
  properties: {
    make: { type: "string" },
    model: { type: "string" },
    license_plate: { type: "string" },
    country_of_registration: { type: ["string", "null"] },
    // null first so AJV does not coerce null → 0 via number branch
    mileage: {
      anyOf: [{ type: "null" }, { type: "string" }, { type: "number" }],
    },
    insurance_on: { type: ["string", "null"] },
    inspection_on: { type: ["string", "null"] },
    road_tax_on: { type: ["string", "null"] },
    registration_on: { type: ["string", "null"] },
    // Shape validated in FleetService (full replace / cap / labels); array|absent only here.
    custom_expirations: {
      type: "array",
      items: { type: "object" },
    },
  },
} as const;

export type AppDeps = {
  store: Store;
  jwtSecret: Uint8Array;
  mailer?: Mailer;
  /** Inject for tests; otherwise from env (may be null). */
  vehicleImages?: VehicleImageStorage | null;
};

declare module "fastify" {
  interface FastifyRequest {
    claims?: AccessClaims;
  }
}

function sendError(reply: FastifyReply, err: AppError) {
  return reply.status(err.status).send({
    error: { code: err.code, message: err.message },
  });
}

function bearer(req: FastifyRequest): string {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw errors.unauthenticated();
  return header.slice("Bearer ".length);
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
    // Keep additionalProperties: false as hard fail (do not silently strip legal fields on individual register).
    ajv: { customOptions: { removeAdditional: false, coerceTypes: "array", useDefaults: true } },
  });
  const identity = new IdentityService(deps.store, deps.jwtSecret, deps.mailer ?? mailerFromEnv());
  let vehicleImages: VehicleImageStorage | null;
  if (deps.vehicleImages !== undefined) {
    vehicleImages = deps.vehicleImages;
  } else {
    const fromEnv = vehicleImageStorageFromEnvDetailed();
    vehicleImages = fromEnv.storage;
    console.log(`@fleet/api vehicle image storage: ${fromEnv.status}`);
  }
  const fleet = new FleetService(deps.store, vehicleImages);
  const revisions = new TenantRevisionRegistry();

  function bumpTenant(companyId: string | undefined) {
    if (companyId) revisions.bump(companyId);
  }

  function sendList(
    req: FastifyRequest,
    reply: FastifyReply,
    companyId: string,
    listKey: ListKey,
    items: unknown[],
    query: { limit?: string; cursor?: string; expiring?: string },
  ) {
    const etag = revisions.etag(companyId, listKey);
    if (ifNoneMatch(req.headers["if-none-match"], etag)) {
      return reply.status(304).header("ETag", etag).send();
    }
    const page = parsePageParams(
      { limit: query.limit, cursor: query.cursor },
      (message) => {
        throw errors.validation(message);
      },
    );
    reply.header("ETag", etag);
    if (!page.paging) {
      return reply.send({ items });
    }
    return reply.send(slicePage(items, page));
  }

  function sendHome(
    req: FastifyRequest,
    reply: FastifyReply,
    companyId: string,
    body: unknown,
  ) {
    const etag = revisions.etag(companyId, "home");
    if (ifNoneMatch(req.headers["if-none-match"], etag)) {
      return reply.status(304).header("ETag", etag).send();
    }
    return reply.header("ETag", etag).send(body);
  }


  await app.register(cors, { origin: true });
  await app.register(sensible);
  await app.register(multipart, {
    limits: { fileSize: MAX_VEHICLE_IMAGE_BYTES, files: 10 },
  });

  app.addHook("preValidation", normalizeBodyEmail);

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) return sendError(reply, err);
    const validation = (err as { validation?: unknown }).validation;
    if (validation) {
      return sendError(reply, errors.validation());
    }
    app.log.error(err);
    return reply.status(500).send({
      error: { code: "internal_error", message: "Unexpected error." },
    });
  });

  const authenticate = async (req: FastifyRequest) => {
    req.claims = await identity.claimsFromAccess(bearer(req));
  };

  const requireSession = async (req: FastifyRequest) => {
    await authenticate(req);
    const claims = req.claims!;
    // ADR-008: deleted principal must not keep using a live access token.
    await identity.requireExistingPrincipal(claims.sub);
  };

  app.post(
    "/v1/auth/register",
    { schema: { body: registerBody } },
    async (req, reply) => {
      const body = req.body as {
        email: string;
        password: string;
        registration_number: string;
        vat_number: string;
        address: string;
      };
      const result = await identity.register(body);
      return reply.status(201).send(result);
    },
  );

  app.post(
    "/v1/auth/register/individual",
    { schema: { body: registerIndividualBody } },
    async (req, reply) => {
      const body = req.body as { email: string; password: string };
      const result = await identity.registerIndividual(body);
      return reply.status(201).send(result);
    },
  );

  app.post("/v1/auth/login", { schema: { body: loginBody } }, async (req) => {
    const body = req.body as { email: string; password: string; client: Client };
    return identity.login(body.email, body.password, body.client);
  });

  app.post(
    "/v1/auth/totp/verify",
    {
      schema: {
        body: {
          type: "object",
          required: ["challenge_token", "code"],
          additionalProperties: false,
          properties: {
            challenge_token: { type: "string" },
            code: { type: "string" },
          },
        },
      },
    },
    async (req) => {
      const body = req.body as { challenge_token: string; code: string };
      return identity.verifyTotpChallenge(body.challenge_token, body.code);
    },
  );

  app.post(
    "/v1/auth/refresh",
    {
      schema: {
        body: {
          type: "object",
          required: ["refresh_token"],
          additionalProperties: false,
          properties: { refresh_token: { type: "string" } },
        },
      },
    },
    async (req) => {
      const body = req.body as { refresh_token: string };
      return identity.refresh(body.refresh_token);
    },
  );

  app.post(
    "/v1/auth/password/forgot",
    {
      schema: {
        body: {
          type: "object",
          required: ["email"],
          additionalProperties: false,
          properties: { email: { type: "string", format: "email" } },
        },
      },
    },
    async (req, reply) => {
      const body = req.body as { email: string };
      await identity.forgotPassword(body.email);
      return reply.status(202).send({});
    },
  );

  app.post(
    "/v1/auth/password/reset",
    {
      schema: {
        body: {
          type: "object",
          required: ["token", "password"],
          additionalProperties: false,
          properties: {
            token: { type: "string" },
            password: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (req, reply) => {
      const body = req.body as { token: string; password: string };
      await identity.resetPassword(body.token, body.password);
      return reply.status(204).send();
    },
  );


  app.post(
    "/v1/auth/invite/preview",
    {
      schema: {
        body: {
          type: "object",
          required: ["token"],
          additionalProperties: false,
          properties: { token: { type: "string", minLength: 1 } },
        },
      },
    },
    async (req) => {
      const body = req.body as { token: string };
      return identity.previewInvite(body.token);
    },
  );

  app.post(
    "/v1/auth/invite/accept",
    {
      schema: {
        body: {
          type: "object",
          required: ["token", "email", "password", "client"],
          additionalProperties: false,
          properties: {
            token: { type: "string", minLength: 1 },
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 1 },
            client: { type: "string", enum: ["web", "mobile"] },
          },
        },
      },
    },
    async (req) => {
      const body = req.body as {
        token: string;
        email: string;
        password: string;
        client: Client;
      };
      return identity.acceptInvite(body);
    },
  );

  app.get("/v1/me", { preHandler: requireSession }, async (req) => {
    return identity.me(req.claims!);
  });

  app.post(
    "/v1/auth/logout",
    {
      preHandler: requireSession,
      schema: {
        body: {
          type: "object",
          required: ["refresh_token"],
          additionalProperties: false,
          properties: { refresh_token: { type: "string" } },
        },
      },
    },
    async (req, reply) => {
      const body = req.body as { refresh_token: string };
      await identity.logout(body.refresh_token);
      return reply.status(204).send();
    },
  );


  app.get("/v1/auth/totp", { preHandler: requireSession }, async (req) => {
    return identity.totpStatus(req.claims!);
  });

  app.post("/v1/auth/totp/setup", { preHandler: requireSession }, async (req) => {
    return identity.totpSetup(req.claims!);
  });

  app.post(
    "/v1/auth/totp/confirm",
    {
      preHandler: requireSession,
      schema: {
        body: {
          type: "object",
          required: ["code"],
          additionalProperties: false,
          properties: { code: { type: "string" } },
        },
      },
    },
    async (req, reply) => {
      const body = req.body as { code: string };
      await identity.totpConfirm(req.claims!, body.code);
      return reply.status(204).send();
    },
  );

  app.post(
    "/v1/auth/totp/disable",
    {
      preHandler: requireSession,
      schema: {
        body: {
          type: "object",
          required: ["code"],
          additionalProperties: false,
          properties: { code: { type: "string" } },
        },
      },
    },
    async (req, reply) => {
      const body = req.body as { code: string };
      await identity.totpDisable(req.claims!, body.code);
      return reply.status(204).send();
    },
  );

  app.get("/v1/admins", { preHandler: requireSession }, async (req, reply) => {
    const body = await identity.listAdmins(req.claims!);
    const q = req.query as { limit?: string; cursor?: string };
    return sendList(req, reply, req.claims!.company_id, "admins", body.items, q);
  });

  app.post(
    "/v1/admins",
    { preHandler: requireSession, schema: { body: emailPassword } },
    async (req, reply) => {
      const body = req.body as { email: string; password: string };
      const created = await identity.createAdmin(req.claims!, body.email, body.password);
      bumpTenant(req.claims!.company_id);
      return reply.status(201).send(created);
    },
  );

  app.get("/v1/drivers", { preHandler: requireSession }, async (req, reply) => {
    const body = await identity.listDrivers(req.claims!);
    const q = req.query as { limit?: string; cursor?: string };
    return sendList(req, reply, req.claims!.company_id, "drivers", body.items, q);
  });

  app.post(
    "/v1/drivers",
    {
      preHandler: requireSession,
      schema: {
        body: {
          type: "object",
          required: ["email"],
          additionalProperties: false,
          properties: {
            email: { type: "string", format: "email" },
          },
        },
      },
    },
    async (req, reply) => {
      const body = req.body as { email: string };
      const created = await identity.createDriver(req.claims!, body.email);
      bumpTenant(req.claims!.company_id);
      return reply.status(201).send(created);
    },
  );

  app.post(
    "/v1/drivers/:id/invite/resend",
    { preHandler: requireSession },
    async (req) => {
      const { id } = req.params as { id: string };
      const res = await identity.resendDriverInvite(req.claims!, id);
      bumpTenant(req.claims!.company_id);
      return res;
    },
  );

  app.get("/v1/drivers/:id", { preHandler: requireSession }, async (req) => {
    const { id } = req.params as { id: string };
    return identity.getDriver(req.claims!, id);
  });

  app.patch(
    "/v1/drivers/:id",
    {
      preHandler: requireSession,
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          properties: {
            email: { type: "string", format: "email" },
            login_enabled: { type: "boolean" },
          },
        },
      },
    },
    async (req) => {
      const { id } = req.params as { id: string };
      const body = req.body as { email?: string; login_enabled?: boolean };
      const patched = await identity.patchDriver(req.claims!, id, body);
      bumpTenant(req.claims!.company_id);
      return patched;
    },
  );

  app.delete("/v1/drivers/:id", { preHandler: requireSession }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await identity.deleteDriver(req.claims!, id);
    bumpTenant(req.claims!.company_id);
    return reply.status(204).send();
  });

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

  app.get("/v1/vehicles/:id/handovers", { preHandler: requireSession }, async (req) => {
    const { id } = req.params as { id: string };
    return fleet.listVehicleHandovers(req.claims!, id);
  });

  app.get("/v1/vehicles/:id/handovers/:handoverId", { preHandler: requireSession }, async (req) => {
    const { id, handoverId } = req.params as { id: string; handoverId: string };
    return fleet.getVehicleHandover(req.claims!, id, handoverId);
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

  return app;
}

type VehicleWriteBody = {
  make?: string;
  model?: string;
  license_plate?: string;
  country_of_registration?: string | null;
  mileage?: number | string | null;
  insurance_on?: string | null;
  inspection_on?: string | null;
  road_tax_on?: string | null;
  registration_on?: string | null;
  /** Runtime shape checked in FleetService.parseCustomExpirations. */
  custom_expirations?: unknown;
};
