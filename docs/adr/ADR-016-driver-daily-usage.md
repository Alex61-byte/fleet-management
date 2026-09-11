# ADR-016 — Driver Daily usage (day-use log)

**Status:** Accepted (amended)  
**Slice:** US-61–US-67 · US-113–US-115 · rules 87–100 · A57–A69 · E59–E70  
**Extends:** ADR-001 Fleet · ADR-012 next-travel eligibility · ADR-014 vehicle mileage (daily usage: no write-through; travel/handover: yes) · ADR-015 handovers (orthogonal) · ADR-008 driver hard-delete (remove usage rows) · ADR-022 manager loop (company report)  
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

None. No outbox. No object storage. No `vehicles.mileage` update.

## Consequences

- Schema migration: nullable end fields, status, refuel columns, open unique index; backfill existing rows as `closed`.
- Backend: Day Start + End of Day methods; company report/CSV columns.
- SDK + web/mobile: two panels; list status + refuel.
- ADR-014/015 unchanged for mileage writers.

## Revisit when

BA adds edit/delete, overnight end&lt;start+1 day, GPS autofill, photos, fuel cost/type, or usage→mileage write-through.

## Amendment (Day Start / End of Day / refuel)

Overturns single-shot seven-field create. Replaces monolithic POST body with **Day Start** create + **End of Day** complete. Adds optional refuel. Floor uses **closed** ends only. Company report includes `status` + refuel fields.
