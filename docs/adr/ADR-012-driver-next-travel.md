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

## Amendment (mileage write-through)

Successful `PUT /v1/driver/travel` **write-through** updates `vehicles.mileage` from `odometer` in the same transaction, with monotonic floor when mileage is set. See **ADR-014** amendment (**A43**). Drivers remain **403** on `POST/PATCH /v1/vehicles`.

## Amendment (available vehicles only)

`GET /v1/driver/vehicles` returns only vehicles **without** an open Handover Out (available after Handover In, or never checked out). `PUT /v1/driver/travel` rejects busy vehicles with **409** `handover_vehicle_open`.

## Amendment (vehicle bind → handover)

Clients treat next travel as **vehicle selection only**. After successful `PUT`, navigate to handover; mileage/odometer and service fields are entered on **Handover Out/In**. Clients may send current `vehicle.mileage` (or `0`) as the travel `odometer` payload to satisfy the existing API shape without a travel-screen odometer field. Do not prefill selection from active travel when that vehicle is no longer in the available list.
