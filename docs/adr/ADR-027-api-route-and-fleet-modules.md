# ADR-027 — API route modules and fleet subdomain split

## Status

Accepted

## Context

`apps/api/src/app.ts` had grown into a monolithic HTTP registration surface. `fleet-service.ts` concentrated all fleet use-cases in one class (~1.3k lines), which slowed review and ownership without changing product behavior.

## Decision

1. **HTTP composition** — `buildApp` stays thin: plugins, error handler, session helper, and route registration. Shared HTTP helpers live in `http.ts`. Domain route registration is split under `src/routes/`:
   - `identity.ts` — auth, account, admins, drivers (company)
   - `driver.ts` — driver-scoped fleet actions
   - `fleet.ts` — company fleet vehicles, docs, issues, reports
   - `schemas.ts` / `context.ts` — shared Fastify schema pieces and route deps typing

2. **Fleet domain** — `FleetService` remains the **facade** used by routes and tests. Implementation is split by subdomain under `src/fleet/`:
   - `shared.ts` — write types and pure helpers
   - `context.ts` — store/images/mailer + JSON mappers
   - `vehicles.ts`, `driver.ts`, `handovers.ts`, `documents.ts`, `reports.ts` — ops classes

Behavior, authz/tenancy, and `/v1` contracts are unchanged.

## Consequences

- Easier ownership of route groups and fleet use-cases.
- Callers continue to depend on `FleetService` only (stable import path).
- Further splits (e.g. `identity-service`) can follow the same facade pattern when needed.
- No client or contract changes.
