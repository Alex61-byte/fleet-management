import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { FleetService } from "../fleet-service.ts";
import type { IdentityService } from "../identity-service.ts";
import type { TenantRevisionRegistry, ListKey } from "../tenant-revision.ts";

export type RouteContext = {
  app: FastifyInstance;
  identity: IdentityService;
  fleet: FleetService;
  requireSession: (req: FastifyRequest) => Promise<void>;
  bumpTenant: (companyId: string | undefined) => void;
  sendList: (
    req: FastifyRequest,
    reply: FastifyReply,
    companyId: string,
    listKey: ListKey,
    items: unknown[],
    query: { limit?: string; cursor?: string; expiring?: string },
  ) => unknown;
  sendHome: (
    req: FastifyRequest,
    reply: FastifyReply,
    companyId: string,
    body: unknown,
  ) => unknown;
};
