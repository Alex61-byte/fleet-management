# ADR-016 — Driver Daily usage (day-use log)

**Status:** Accepted  
**Slice:** US-61–US-67 · rules 87–100 · A57–A69 · E59–E67  
**Extends:** ADR-001 Fleet · ADR-012 next-travel eligibility · ADR-014 vehicle mileage (no write-through) · ADR-015 handovers (orthogonal) · ADR-008 driver hard-delete (remove usage rows)  
**Supersedes:** n/a

## Context

Drivers log **Daily usage** (calendar day use of a vehicle: places, distances, times) against their **active next-travel** vehicle. Distinct from next-travel selection (ADR-012) and handover custody (ADR-015). Must not update `vehicles.mileage`. Owner/Admin reporting is out of slice. Hard-delete must remove that driver’s usage rows (A69).

## Decision

### 1. Ownership

| | |
| --- | --- |
| **Module** | **Fleet** (table, routes, validation, list) |
| **Identity** | On driver hard-delete: existing session revoke + void open Outs + clear travel **and** **delete all** `driver_daily_usages` for that driver (in-process, same request/transaction; no bus) |
| **Clients** | No invented authz; offline submit block is client-only (E67) |

### 2. Domain model

- **Daily usage** — immutable driver-authored day-use **log** row (A57).
- **Vehicle** — frozen at create from caller’s **active** `driver_travel_selections.vehicle_id` (A58). Not client-supplied.
- **Multiplicity** — many rows per driver per `usage_date` allowed (A64).
- **No edit/delete** HTTP this slice (A66, E65).
- **Not handover** — no Out/In linkage; open Out not required (rule 100).
- **Not mileage master** — never writes `vehicles.mileage` (A62); handover remains write-through path (ADR-015).

### 3. Eligibility & invariants (server-enforced)

| Rule | Enforcement |
| --- | --- |
| Creator | `role=driver`, authenticated usable session (Owner/Admin → 403) |
| Vehicle | Active next-travel for `claims.sub`, same `company_id`; else **409** `daily_usage_no_active_travel` (E59) |
| Required | `usage_date`, `start_place`, `start_distance`, `start_time`, `end_place`, `end_distance`, `end_time` (A59) |
| Places | Non-empty strings after trim |
| Distances | ≥ 0, max 1 decimal (`parseOdometer` family); **end ≥ start**; if `vehicle.mileage` set → **start ≥ mileage** (A61) |
| Unit | Derive `distance_unit` from vehicle country (A34); store value **+** unit; reject client unit fields (A60) |
| Date | `usage_date` = `YYYY-MM-DD` calendar date (opaque local day; no server TZ conversion) |
| Times | `start_time` / `end_time` = local wall-clock `HH:mm` (00:00–23:59); **end_time ≥ start_time** on that date (A63) |
| List | Caller’s rows only, `created_at DESC` (A65) |
| Tenancy | `company_id` from claims; vehicle must belong to company |

### 4. HTTP shape

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| `GET` | `/v1/driver/daily-usage` | Driver | List own entries newest first |
| `POST` | `/v1/driver/daily-usage` | Driver | Create one log (JSON) |

- **No** `vehicle_id` on body.
- **No** PATCH/DELETE / Owner list routes.
- **No** multipart / images.

### 5. Persistence

Table `driver_daily_usages`:

| Column | Notes |
| --- | --- |
| `id` | UUID PK |
| `company_id` | FK companies |
| `driver_id` | FK principals **ON DELETE CASCADE** (A69) |
| `vehicle_id` | FK vehicles (no vehicle cascade delete required this slice) |
| `usage_date` | `DATE` / ISO date |
| `start_place`, `end_place` | TEXT NOT NULL |
| `start_distance`, `end_distance` | DOUBLE PRECISION NOT NULL |
| `distance_unit` | `mi` \| `km` |
| `start_time`, `end_time` | TEXT `HH:mm` (or equivalent check) |
| `created_at` | timestamptz |

Indexes: `(driver_id, created_at DESC)`, `(company_id)`.

Memory store: mirror maps + `deleteDailyUsageForDriver` for hard-delete parity with Postgres CASCADE.

### 6. Authz summary

| Actor | Create | List own | List others / Owner UI |
| --- | --- | --- | --- |
| Driver | Yes (if active travel) | Yes | **Never** |
| Owner/Admin | **403** `forbidden` (E60/E64) | **403** | Out of slice |
| Other company | — | — | N/A (no shared ids on these routes) |

### 7. Error codes

| BA | HTTP | `error.code` |
| --- | --- | --- |
| E59 | 409 | `daily_usage_no_active_travel` |
| E60 / E64 | 403 | `forbidden` |
| E61–E63 | 400 | `validation_error` |
| E65 | — | No PATCH/DELETE routes |
| E66 | 404 | `not_found` (if ever resolving foreign ids; create path uses travel vehicle) |
| E67 | — | Client offline block only |

### 8. Events / side effects

None. No outbox. No object storage. No `vehicles.mileage` update.

## Consequences

- Backend: schema, Fleet service methods, Identity hard-delete hook, `errors.dailyUsageNoActiveTravel`, http-v1 tests.
- SDK: types + list/create helpers.
- Frontend (after BE): web + mobile task screens + hub per design; gated UX; offline disable submit.
- ADR-014/015 unchanged: only handover (and Owner vehicle PATCH) write mileage.

## Revisit when

BA adds Owner reporting, edit/delete, overnight end&lt;start+1 day, GPS autofill, photos, or usage→mileage write-through.
