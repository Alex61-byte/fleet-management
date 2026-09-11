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
| **Authz** | Owner/Admin company routes for direct master edit. Drivers **403** on `POST/PATCH /v1/vehicles`. **Travel write-through:** successful `PUT /v1/driver/travel` **does** set `vehicles.mileage` from parsed `odometer` in the **same transaction** as the travel row (**A43**). |
| **Country change** | Re-derive `mileage_unit` on read; **do not** convert the stored number (E43). |
| **Driver list (Should)** | `GET /v1/driver/vehicles` **may** include `mileage` + `mileage_unit` read-only when present. |

## Consequences

- Clients label the control **Miles** / **Kilometers** from unit (not dual field names).
- Master mileage writers: OA vehicle POST/PATCH; **driver travel PUT** (write-through); **handover** Out/In (ADR-015). Daily usage does **not** (ADR-016).
- Schema: `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS mileage DOUBLE PRECISION;`

## Alternatives rejected

- Reuse only travel odometer as fleet mileage — wrong lifecycle (per-driver selection vs asset master data).
- Store unit on the vehicle row — duplicates A34; country is source of truth.
- Auto-convert mi↔km on country edit — silent data corruption risk.
- Client-only “show travel odometer as mileage” without server write — OA list would drift.

## Amendment

**ADR-015:** Successful **Handover Out/In** sets `vehicles.mileage` to the handover reading (A52).

**Travel write-through (A43):** On successful `PUT /v1/driver/travel`, after `parseOdometer`:
- If `vehicles.mileage` is **non-null** and `odometer < mileage` → **400** `validation_error`; no travel row; mileage unchanged.
- Else set `vehicles.mileage = odometer` in the **same DB transaction** as activating the travel selection.
- If mileage was **null**, any valid odometer (≥ 0, ≤ 1 decimal) sets it.
- Drivers still cannot call fleet vehicle write routes (403). Unit still derived from country on read (A34); no unit column write.
