# ADR-010 — Company legal fields and address lookup

## Status

Accepted

## Context

US-01 requires registration number, VAT, and address at company sign-up.

## Decision

- Store on `companies`: `name` (display, required on create; empty allowed for legacy until Owner sets), `registration_number`, `vat_number`, `address` (required text on create).
- Register API requires name + legal/address fields; no lat/lon on contract.
- `GET /v1/me` exposes `company_name` + `company_name_required`; Owner may `PATCH /v1/company/name` for legacy empty names.
- Address **lookup** is **client-only** free Nominatim/OSM assist (User-Agent, debounce). No paid Places; no server geocode proxy this slice.
- Lookup failure must not block manual address (E34).

## Consequences

- Sign-up UI includes company name + three legal/address fields + optional lookup.
- Owner shell shows blocking dialog when `company_name_required`.
- Existing DBs need schema migrate (nullable backfill not required for greenfield tests; ALTER ADD columns).
