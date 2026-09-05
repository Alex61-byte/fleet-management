# ADR-012 — Driver next-travel vehicle + odometer

## Status
Accepted

## Context
Drivers need to pick a company vehicle for the next travel and record odometer. Unit must follow registration country (miles vs km), not driver preference.

## Decision
- New resource **driver travel selection** (active one per driver).
- `GET /v1/driver/vehicles` — company vehicles for the signed-in driver (read-only list with `odometer_unit`).
- `GET /v1/driver/travel` — current active selection or `null`.
- `PUT /v1/driver/travel` — body `{ vehicle_id, odometer }`; server derives unit from vehicle country; replaces prior active row.
- Miles countries (normalized): `us`, `usa`, `united states`, `gb`, `uk`, `united kingdom`, `lr`, `liberia`, `mm`, `myanmar` (+ common ISO2).
- Else **km** (including empty country).
- Odometer: number ≥ 0, max 1 decimal; stored with unit at write time.
- Owner/Admin fleet routes unchanged; drivers still forbidden on `POST/PATCH /v1/vehicles`.
- Table `driver_travel_selections`: id, company_id, driver_id, vehicle_id, odometer, odometer_unit, active, created_at; partial unique active per driver.

## Consequences
- Driver home grows a next-travel panel (web + mobile).
- Hard-delete driver clears their selections.
- No live GPS / trip start-stop in this slice.
