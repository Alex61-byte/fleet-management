# ADR-016 — Driver Daily usage (day-use log)

**Status:** Accepted (amended)  
**Slice:** US-61–US-67 · US-113–US-115 · US-116–US-118 · rules 87–100 · 183–190 · A57–A69 · A135–A140 · E59–E70 · E106–E111  
**Extends:** ADR-001 Fleet · ADR-012 next-travel eligibility · ADR-014 vehicle mileage (daily usage: no write-through; travel/handover: yes) · ADR-015 handovers (orthogonal) · ADR-008 driver hard-delete (remove usage rows) · ADR-022 manager loop (company report **and** service-due progress inputs)  
**Supersedes:** n/a

## Context

Drivers log **Daily usage** against their **active next-travel** vehicle. Product needs **independently savable Day Start and End of Day**, plus optional **refuel** fields for Owner/Admin reporting value. Must not update `vehicles.mileage`. Hard-delete must remove that driver’s usage rows (A69).

## Decision

### 1. Ownership

| | |
| --- | --- |
| **Module** | **Fleet** (table, routes, validation, list, company report) |
| **Identity** | On driver hard-delete: revoke sessions + void open Outs + clear travel **and** **delete all** `driver_daily_usages` for that driver (in-process; no bus) |
| **Clients** | No invented authz; offline submit block is client-only (E67) |

### 2. Domain model

- **Daily usage** — driver-authored day-use **log** row with lifecycle **open → closed** (A57).
- **Day Start** — creates **open** row; vehicle frozen from active next-travel (A58).
- **End of Day** — completes the driver’s **single open** row; does not change start fields (A66).
- **Multiplicity** — many **closed** rows per driver per `usage_date` allowed; at most **one open** per driver (A64).
- **No free-form edit/delete** of closed rows; open only via End of Day (A66, E65).
- **Not handover** — no Out/In linkage; open Out not required (rule 100).
- **Not mileage master** — never writes `vehicles.mileage` (A62).
- **Service progress contributor (closed only)** — a **closed** row’s `end_distance` and `usage_date` are **inputs** to API remaining-service math (rules 183–185). Open rows contribute neither. Usage **never** creates a service baseline (188). Derivation owned with service-due (ADR-022); this module only persists truthful closed fields.
- **Optional refuel** — `refuel_amount` and/or `refuel_at_mileage` on either save; amount unit L/gal from A34 (A59, A60).

### 3. Eligibility & invariants (server-enforced)

| Rule | Enforcement |
| --- | --- |
| Creator | `role=driver`, authenticated usable session (Owner/Admin → 403) |
| Day Start vehicle | Active next-travel for `claims.sub`, same `company_id`; else **409** `daily_usage_no_active_travel` (E59) |
| One open | Day Start while open exists → **409** `daily_usage_already_open` (E68) |
| End of Day target | Driver’s open row; none → **409** `daily_usage_no_open` (E69) |
| Day Start required | `usage_date`, `start_place`, `start_distance`, `start_time` |
| End of Day required | `end_place`, `end_distance`, `end_time` |
| Places | Non-empty strings after trim |
| Distances | ≥ 0, max 1 decimal; on close **end ≥ start**; on start **start ≥ max(vehicle.mileage when set, latest closed end_distance on same vehicle)** (A61) |
| Unit | `distance_unit` from vehicle country (A34); store value + unit |
| Refuel | Optional independently; ≥ 0 max 1 decimal; `refuel_amount_unit` L\|gal from A34 when amount set |
| Date | `usage_date` = `YYYY-MM-DD` |
| Times | `HH:mm`; on close **end_time ≥ start_time** (A63) |
| List | Caller’s rows only, `created_at DESC` (A65) |

### 4. HTTP shape

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| `GET` | `/v1/driver/daily-usage` | Driver | List own entries (open + closed) newest first |
| `POST` | `/v1/driver/daily-usage` | Driver | **Day Start** (create open) |
| `POST` | `/v1/driver/daily-usage/end` | Driver | **End of Day** (close open) |
| `GET` | `/v1/reports/daily-usage` (+ `.csv`) | Company OA | Company report including status + refuel |

- **No** `vehicle_id` on Day Start body.
- **No** general PATCH/DELETE.
- **No** multipart / images.

### 5. Persistence

Table `driver_daily_usages` (amended): status open|closed; end_* nullable while open; refuel_*; closed_at; partial unique one open per driver. Existing rows backfilled as closed.

### 6. Authz summary

| Actor | Day Start | End of Day | List own | Company report |
| --- | --- | --- | --- | --- |
| Driver | Yes (if active travel, no open) | Yes (if open) | Yes | Never |
| Company Owner/Admin | 403 | 403 | 403 | Yes |
| Individual Owner/Admin | 403 | 403 | 403 | 403 |

### 7. Error codes

| BA | HTTP | `error.code` |
| --- | --- | --- |
| E59 | 409 | `daily_usage_no_active_travel` |
| E60 / E64 | 403 | `forbidden` |
| E61–E63 / E70 | 400 | `validation_error` |
| E65 | — | No free-form PATCH/DELETE |
| E68 | 409 | `daily_usage_already_open` |
| E69 | 409 | `daily_usage_no_open` |
| E67 | — | Client offline block only |

### 8. Events / side effects

- **No** outbox, object storage, or `vehicles.mileage` update (**A62**).
- **End of Day success:** row → `closed` with end_* + `closed_at`. **No** required inline service payload on the Daily usage response.
- **Remaining service:** not stored on the usage row. **Recompute-on-read** (and/or any immediately consistent post-close path) for `GET /v1/service-due` and OA service notification inputs must observe the new closed `end_distance` / `usage_date` (**A138**). Day Start alone does not move distance progress (**A135**, E106).

## Consequences

- Schema migration: nullable end fields, status, refuel columns, open unique index; backfill existing rows as `closed`.
- Backend: Day Start + End of Day methods; company report/CSV columns.
- SDK + web/mobile: two panels; list status + refuel.
- ADR-014/015 unchanged for mileage writers.
- Service-due / OA service menu must include closed Daily usage in progress odometer and as-of date (ADR-022); clients must not reimplement (A139).
- Store/query hint (implementation): efficient **max closed `end_distance`** and **max closed `usage_date`** per `vehicle_id` with row after service-baseline handover (e.g. filter `status=closed` and timestamp/date ≥ baseline; partial index or per-vehicle aggregate). Not a separate progress table this slice.

## Revisit when

BA adds edit/delete, overnight end&lt;start+1 day, GPS autofill, photos, fuel cost/type, usage→mileage write-through, or materialized service progress (FE-owned remaining math never).

## Amendment (Day Start / End of Day / refuel)

Overturns single-shot seven-field create. Replaces monolithic POST body with **Day Start** create + **End of Day** complete. Adds optional refuel. Floor uses **closed** ends only. Company report includes `status` + refuel fields.

## Amendment (US-116–US-118 — remaining service inputs)

Closed Daily usage feeds **API-only** remaining service (distance + days) without becoming mileage master or baseline owner. EOD close is the distance progress event; `usage_date` participates in `as_of_date` with UTC today. Semantics and board inclusion stay in ADR-022 / `GET /v1/service-due`. **A62** held.
