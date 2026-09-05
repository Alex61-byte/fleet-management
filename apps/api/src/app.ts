import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { AppError, errors } from "./errors.ts";
import { normalizeEmail, type AccessClaims, type Client } from "./domain.ts";
import { FleetService } from "./fleet-service.ts";
import { IdentityService } from "./identity-service.ts";
import type { Store } from "./store.ts";
import { mailerFromEnv, type Mailer } from "./mailer.ts";

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
    insurance_on: { type: ["string", "null"] },
    inspection_on: { type: ["string", "null"] },
    road_tax_on: { type: ["string", "null"] },
    registration_on: { type: ["string", "null"] },
  },
} as const;

export type AppDeps = {
  store: Store;
  jwtSecret: Uint8Array;
  mailer?: Mailer;
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
  const app = Fastify({ logger: false });
  const identity = new IdentityService(deps.store, deps.jwtSecret, deps.mailer ?? mailerFromEnv());
  const fleet = new FleetService(deps.store);

  await app.register(cors, { origin: true });
  await app.register(sensible);

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

  app.get("/v1/admins", { preHandler: requireSession }, async (req) => {
    return identity.listAdmins(req.claims!);
  });

  app.post(
    "/v1/admins",
    { preHandler: requireSession, schema: { body: emailPassword } },
    async (req, reply) => {
      const body = req.body as { email: string; password: string };
      const created = await identity.createAdmin(req.claims!, body.email, body.password);
      return reply.status(201).send(created);
    },
  );

  app.get("/v1/drivers", { preHandler: requireSession }, async (req) => {
    return identity.listDrivers(req.claims!);
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
      return reply.status(201).send(created);
    },
  );

  app.post(
    "/v1/drivers/:id/invite/resend",
    { preHandler: requireSession },
    async (req) => {
      const { id } = req.params as { id: string };
      return identity.resendDriverInvite(req.claims!, id);
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
      return identity.patchDriver(req.claims!, id, body);
    },
  );

  app.delete("/v1/drivers/:id", { preHandler: requireSession }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await identity.deleteDriver(req.claims!, id);
    return reply.status(204).send();
  });

  app.get("/v1/vehicles", { preHandler: requireSession }, async (req) => {
    const q = req.query as { expiring?: string };
    return fleet.list(req.claims!, q.expiring === "true");
  });

  app.post(
    "/v1/vehicles",
    { preHandler: requireSession, schema: { body: vehicleWrite } },
    async (req, reply) => {
      const created = await fleet.create(req.claims!, req.body as VehicleWriteBody);
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
      return fleet.patch(req.claims!, id, req.body as VehicleWriteBody);
    },
  );

  app.get("/v1/home", { preHandler: requireSession }, async (req) => {
    return fleet.home(req.claims!);
  });

  app.get("/v1/driver/vehicles", { preHandler: requireSession }, async (req) => {
    return fleet.listDriverVehicles(req.claims!);
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

  return app;
}

type VehicleWriteBody = {
  make?: string;
  model?: string;
  license_plate?: string;
  country_of_registration?: string | null;
  insurance_on?: string | null;
  inspection_on?: string | null;
  road_tax_on?: string | null;
  registration_on?: string | null;
};
