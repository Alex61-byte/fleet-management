# ADR-004 — Vehicle compliance dates

**Status:** Accepted

## Decision

A **vehicle** belongs to one company. Fields this slice:

- `id` UUID (stable; future GPS foreign key)
- `make` and `model` text (Admin-entered identity; not a catalog)
- `license_plate` text
- `country_of_registration` text (not a catalog)
- `insurance_on`, `inspection_on`, `road_tax_on`, `registration_on` — **date** (no time), nullable

No document storage. No legal engine. Save **allowed** when dates are past or inside the window.

**Warnings are derived on read**, not stored. Only **insurance / inspection / road tax** participate in expiry:

- Skip null dates; **`registration_on` never produces a warning** (stored only; not compliance expiry)
- `expired` if `date < today_utc`
- `due_soon` if `date >= today_utc` AND `date <= today_utc + 30 days`
- Else no warning for that field

List and detail include `warnings: [{ field, state }]` with `field` ∈ `insurance_on` | `inspection_on` | `road_tax_on`. Home “due soon or expired” is vehicles where `warnings.length > 0`.

## Alternatives

1. Persist `is_expired` — stale without a daily job; rejected.
2. Country catalog of intervals — out of BA scope.

## Consequences

Clients must not reimplement the 30-day rule for authorization; they may display API `warnings`. Timezone: **UTC date** until BA specifies company TZ.

**Nav urgency (US-28):** Owner/Admin **Vehicles** chrome (web side nav + mobile tabs) may derive fleet-wide worst-wins bands from **insurance / inspection / road tax** dates (not `registration_on`) on `GET /v1/vehicles`, using UTC calendar `daysUntil`: **critical/red** if any `daysUntil < 7` (incl. overdue); **warning/orange** if no critical and any `daysUntil = 7`; else none. Display-only; do **not** encode nav bands in `warnings.state`.
