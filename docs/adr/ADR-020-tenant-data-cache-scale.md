# ADR-020 — Tenant data cache at scale

**Status:** Accepted  
**Slice:** scale caching · concurrent sessions · list read efficiency  
**Related:** [ADR-001](ADR-001-system-boundaries.md), [ADR-003](ADR-003-tenancy-principals.md), [ADR-005](ADR-005-clients.md), [contracts/http-v1.md](../contracts/http-v1.md)

## Context

Product targets **millions of users** and many **concurrent sessions**. Today list GETs return full tenant payloads on every hit; **client-only** memory cache is insufficient (cold starts, multi-device, multi-tab, no shared invalidation signal).

Need a server-backed **freshness** signal and optional **bounded list pages** without abandoning the modular Fastify monolith or inventing a second source of truth.

## Decision

| | |
| --- | --- |
| **(a) Tenant data revision + conditional GET** | Maintain a **per-tenant** monotonic **data revision**. Key **list** responses include **`ETag`** derived from that revision (and list identity: path + material query). Clients send **`If-None-Match`**. On match → **304** empty body; on mismatch → **200** + body + new `ETag`. |
| **(b) Cursor pagination (opt-in)** | Large lists support **`limit`** (default **50**, max **100**) + opaque **`cursor`**. When pagination params are present → body `{ "items": [...], "next_cursor": string \| null }`. When **absent** → **preserve current full-list body** for small tenants. **Always** send `ETag` on 200 list responses in scope. |
| **(c) Client SWR / Query** | Web + mobile: stale-while-revalidate with **`staleTime`**, shared cache keys, and **mutation → invalidate**. Cache keys **must include `company_id`** (and role/principal where lists differ). |
| **(d) Rate limits + DB ops** | Existing **429** / auth rate limits **stay**. Connection **pooler** and read **replicas** are **operational** — not a contract change this slice. |
| **(e) No Next BFF as SoT** | Next.js must **not** become a second cache authority for fleet/identity lists. **API remains system of record** (ADR-001 / ADR-005). |

### In-scope conditional list GETs

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/v1/vehicles` | Incl. `?expiring=true` — ETag **must** vary with filter |
| `GET` | `/v1/drivers` | |
| `GET` | `/v1/admins` | |
| `GET` | `/v1/home` | Aggregate snapshot; same tenant revision family |
| `GET` | `/v1/driver/vehicles` | Driver read-only vehicle list |

### Revision bump (minimum)

Any successful mutation that changes data visible on the above lists for that `company_id` **must** advance the tenant revision (prefer **broad bump on fleet/identity writes** over under-invalidation).

### Revision storage

**Day-1:** **in-process** map `company_id → revision` is **allowed**. **Redis not required** day-1; may be added for multi-instance coherence without changing the HTTP contract (`ETag` remains opaque).

## Non-goals

- **WebSockets / SSE** push invalidation this slice  
- **Redis mandatory** day-1  
- Changing authz, error envelope codes, or detail `GET`/`PATCH` resource shapes  
- CDN/public caching of authenticated lists  
- Cross-tenant or global shared list cache  

## Consequences

- Clients that ignore `ETag` still work; bandwidth savings require `If-None-Match`.  
- Multi-instance API without shared revision store may under-serve 304 until Redis/DB-backed revision — acceptable early; fix operationally.  
- ETag preimage is **tenant + list + filter** (not per-page cursor) so 304 applies when data is unchanged across pages.  
- FE owns SWR wiring; BE owns revision, ETag, 304, optional cursor.

## Alternatives rejected

1. **Client-only cache** — rejected: no cross-session coherence at target scale.  
2. **Next.js BFF / RSC cache as source of truth** — rejected: duplicates rules; Expo drift (ADR-001/005).  
3. **WebSockets-first invalidation** — deferred; revisit with live GPS/ops.  
4. **Redis-mandatory day-1** — rejected: ops cost before multi-node pain.  
5. **Breaking all list bodies to pages only** — rejected: additive opt-in pagination preserves small-tenant clients.

## Revisit when

- Live **GPS** / high-churn telemetry  
- **Multi-region** active-active  
- **Huge single-tenant** fleets where tenant-global revision is too coarse  
- Multi-node **revision skew** forces shared store (Redis/Postgres)

## Amendment note

Extends read path only. Does not change tenancy fail-closed rules (ADR-003) or modular monolith boundary (ADR-001).
