# ADR-014 — Vehicle mileage (current odometer on fleet record)

**Status:** Accepted  
**Slice:** US-45–US-50 · rules 64–71 · A42–A44 · design/pages/vehicles.md Mileage

## Context

Owner/Admin need an optional **current odometer / mileage reading** on the **vehicle** master record. Driver next-travel already stores **odometer** on `driver_travel_selections` (ADR-012). Those scopes must stay separate this slice.

## Decision

| | |
| --- | --- |
| **Storage** | `vehicles.mileage` nullable `DOUBLE PRECISION` (or numeric). No unit column on the row. |
| **API** | JSON `mileage: number \| null`. Read-only `mileage_unit: "mi" \| "km"` derived via `odometerUnitForCountry(country_of_registration)` (same A34 map as ADR-012). |
| **Write** | POST/PATCH optional `mileage` (`number` \| `string` \| `null`). Parse with same rules as `parseOdometer` (≥ 0, ≤ 1 decimal). Empty/null clears. Reject `mileage_unit` on body (`additionalProperties: false`). |
| **Authz** | Owner/Admin company routes only. Drivers **403** on fleet vehicle writes. Driver travel PUT **must not** update `vehicles.mileage`. |
| **Country change** | Re-derive `mileage_unit` on read; **do not** convert the stored number (E43). |
| **Driver list (Should)** | `GET /v1/driver/vehicles` **may** include `mileage` + `mileage_unit` read-only when present. |

## Consequences

- Clients label the control **Miles** / **Kilometers** from unit (not dual field names).
- Future “sync travel → vehicle mileage” needs a new BA decision; not implied here.
- Schema: `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS mileage DOUBLE PRECISION;`

## Alternatives rejected

- Reuse only travel odometer as fleet mileage — wrong lifecycle (per-driver selection vs asset master data).
- Store unit on the vehicle row — duplicates A34; country is source of truth.
- Auto-convert mi↔km on country edit — silent data corruption risk.

## Amendment

**ADR-015:** Successful **Handover Out/In** sets `vehicles.mileage` to the handover reading (A52). Driver travel PUT still must not (A43).
