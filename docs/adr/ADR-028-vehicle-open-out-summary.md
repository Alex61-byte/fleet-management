# ADR-028 — Vehicle open-Out summary on OA reads

**Status:** Accepted  
**Slice:** US-119 · rule 191 · A141–A142 · E112–E114  
**Extends:** ADR-015 handovers · ADR-017 open_out menu · ADR-020 list ETag · ADR-003 tenancy  
**Supersedes:** n/a

## Context

Company OA must show open custody + holding driver on **vehicle list and detail** (US-119), not only the notification menu (US-111) or Handovers history. Open Outs already exist (`findOpenOutForVehicle` / `listOpenOutsForCompany`, status `open`). Clients must not N+1 history fetches per card.

## Decision

1. **Embed** on the **Vehicle** resource (all OA Vehicle reads that return Vehicle):  
   `open_out: null | { handover_id, driver: { id, email } | null, created_at }`  
   - Open Out only (not closed/voided). At most one per vehicle (existing invariant).  
   - `driver` matches handover list ref; `null` if unknown/removed (A141).  
   - **Individual:** always `null` (no company driver handovers). Field still present for stable JSON.  
   - **Not** accepted on POST/PATCH body.

2. **BE load:** `GET /v1/vehicles` — batch open Outs for `company_id`, join by `vehicle_id`. `GET /v1/vehicles/:id` (and other Vehicle-returning OA handlers) — single open Out. Prefer existing store methods; avoid per-item queries on list.

3. **Menu unchanged:** `GET /v1/handovers/open` remains for ADR-017 / sdk `openOuts`. List/detail do **not** depend on a second client round-trip for the cue.

4. **Cache (ADR-020):** `open_out` is list-visible. No new list key. Tenant revision **must** advance on Out create, In close, and open-Out void (hard-delete) so `/v1/vehicles` ETag/If-None-Match stays correct. Opaque ETag preimage unchanged.

5. **Authz:** Owner/Admin Vehicle routes only. Drivers stay 403 on fleet vehicle CRUD (E55/E114). Cross-company 404 (E56).

## Consequences

- BE owns JSON + batching + revision bumps; FE owns Company list/detail cues; Individual no cue.
- Handovers tab remains history-only (US-55); summary is not a history rewrite.

## Alternatives rejected

1. Client-only join via `/handovers/open` — extra coupling; detail still awkward; easy drift.  
2. Per-vehicle `GET …/handovers` for cards — N+1; over-fetch history.  
3. New custody-only route/DTO — duplicate Vehicle reads; unnecessary surface.

## Revisit when

- Multi open-Out per vehicle (product change)  
- Richer holder identity beyond `{id,email}`  
- Deriving menu solely from vehicle list (optional consolidation)
