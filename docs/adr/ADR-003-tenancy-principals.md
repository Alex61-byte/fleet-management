# ADR-003 — Tenancy and principals

**Status:** Accepted

## Decision

One **company** per sign-up. One **principal** table (or equivalent) for Owner, Admin, and Driver so **email is unique globally**.

| role | Created by | TOTP | Surfaces | Flags |
| --- | --- | --- | --- | --- |
| `owner` | Register | optional | web + mobile | last Owner cannot be deleted |
| `admin` | Owner only | optional | web + mobile | cannot create admins |
| `driver` | Owner or Admin | never | web + mobile (auth + minimal home only) | `must_change_password`, `login_enabled` (Should) |

All fleet and admin mutations require `company_id` from the token to match the row. Cross-company access: **404** `not_found` (no leak) or **403** `forbidden` for privilege (Admin creating Admin).

Register: single transaction insert company + owner principal. Duplicate email: **409** `email_in_use`; no company row left.

Disable driver: `login_enabled=false`; row remains; login **403** `login_disabled`.

Hard delete driver (US-27): **remove** the driver principal for the caller’s company (see [ADR-008](ADR-008-driver-hard-delete.md)). Distinct from disable. Email becomes available for a new principal. Owner/Admin only; cross-company **404** `not_found`. No vehicle cascade.

No second Owner in this slice (A14). Role `dispatcher` / `mechanic` must not appear in schema enums until a later BA.

## Alternatives

1. Separate `users` and `drivers` tables without a unified email constraint — risks duplicate emails (violates A6).
2. Driver as the same type as Admin — would allow TOTP and Owner management UI; violates BA. Drivers on web for **auth + minimal home** is allowed; fleet/admin UI is not.

## Consequences

`GET /v1/me` returns `role` so Expo can choose shell. Never trust client-supplied `company_id` on writes.
