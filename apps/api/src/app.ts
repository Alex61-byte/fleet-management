import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import sensible from "@fastify/sensible";
import { AppError, errors } from "./errors.ts";
import type { AccessClaims } from "./domain.ts";
import { FleetService } from "./fleet-service.ts";
import { IdentityService } from "./identity-service.ts";
import type { Store } from "./store.ts";
import { mailerFromEnv, type Mailer } from "./mailer.ts";
import {
  MAX_COMPLIANCE_DOC_BYTES,
  MAX_VEHICLE_IMAGE_BYTES,
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
import { bearer, normalizeBodyEmail, sendError } from "./http.ts";
import { registerIdentityRoutes } from "./routes/identity.ts";
import { registerDriverRoutes } from "./routes/driver.ts";
import { registerFleetRoutes } from "./routes/fleet.ts";

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

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
    // Keep additionalProperties: false as hard fail (do not silently strip legal fields on individual register).
    ajv: { customOptions: { removeAdditional: false, coerceTypes: "array", useDefaults: true } },
  });
  const mailer = deps.mailer ?? mailerFromEnv();
  const identity = new IdentityService(deps.store, deps.jwtSecret, mailer);
  let vehicleImages: VehicleImageStorage | null;
  if (deps.vehicleImages !== undefined) {
    vehicleImages = deps.vehicleImages;
  } else {
    const fromEnv = vehicleImageStorageFromEnvDetailed();
    vehicleImages = fromEnv.storage;
    console.log(`@fleet/api vehicle image storage: ${fromEnv.status}`);
  }
  const fleet = new FleetService(deps.store, vehicleImages, mailer);
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
    limits: {
      fileSize: Math.max(MAX_VEHICLE_IMAGE_BYTES, MAX_COMPLIANCE_DOC_BYTES),
      files: 10,
    },
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

  const ctx = {
    app,
    identity,
    fleet,
    requireSession,
    bumpTenant,
    sendList,
    sendHome,
  };

  registerIdentityRoutes(ctx);
  registerDriverRoutes(ctx);
  registerFleetRoutes(ctx);

  return app;
}
