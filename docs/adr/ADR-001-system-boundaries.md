# ADR-001 — System boundaries

**Status:** Accepted  
**Slice:** first (auth, drivers, fleet records)

## Decision

Ship a **modular Fastify monolith** (`/v1`) with **PostgreSQL** as the only datastore. **Next.js** (Owner/Admin web) and **Expo** (one mobile app) are clients. No message bus. No GPS ingest API.

Modules inside the API: **Identity** (company, principals, auth) and **Fleet** (vehicles, compliance dates). Fleet never authenticates users; it trusts Identity’s token claims (`principal_id`, `company_id`, `role`, `must_change_password`).

## Alternatives

1. Identity + Fleet microservices — rejected: no scale or team split; sign-up would be distributed.
2. Next.js as BFF owning rules — rejected: Expo would duplicate or drift; BA AC must hold on both surfaces.

## Consequences

- Backend implements one service, versioned HTTP, JSON Schema validation.
- Frontend does not persist fleet/auth rules.
- Later tracking: add ingest as a new module or service **without** changing `vehicle.id` ownership.

## Revisit when

BA starts dispatch or GPS; load or team boundaries change.
