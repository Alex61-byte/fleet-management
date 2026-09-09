# ADR-018 — Account kinds (company vs individual)

**Status:** Accepted  
**Slice:** US-77–US-85 · rules 117–128 · A82–A90 · E73–E79  
**Extends:** ADR-001 · ADR-002 · ADR-003 · ADR-010  
**Supersedes:** n/a (narrows ADR-003 “one company per sign-up” to “one tenant per sign-up” with kind)

## Context

BA introduces two **account kinds** at self-registration: **company** (org + legal fields + drivers/admins) and **individual** (email + password only; own vehicles; no drivers/admins). Kind is immutable. Existing tenants are company. Clients need `account_kind` to choose shell; API must enforce Company-only admin surfaces.

Design: [account-kind.md](../../design/pages/account-kind.md), [individual-sign-up.md](../../design/pages/individual-sign-up.md).

## Decision

### 1. Tenant kind

| | |
| --- | --- |
| Storage | On tenant row (`companies`): `account_kind` ∈ {`company`, `individual`} **NOT NULL** |
| Set | Only in register transaction |
| Mutable | **No** this slice (E79) — no HTTP to change kind |
| Default / migrate | All pre-slice rows → `company` (A88, US-84) |
| Tenant id | Still exposed as `company_id` on principals, tokens, FKs, storage keys |

### 2. Register HTTP (backward compatible company path)

| Path | Kind | Body | Stories |
| --- | --- | --- | --- |
| `POST /v1/auth/register` | **Always** `company` | email, password, registration_number, vat_number, address (ADR-010) | US-01 |
| `POST /v1/auth/register/individual` | **Always** `individual` | email, password only | US-78 |

**Why separate individual route (not polymorphic register):**

- Keeps company register **schema and clients unchanged**.
- Matches two design flows; avoids conditional required legal fields on one operation.
- Clear OpenAPI / Fastify schemas; less accidental Individual create with empty legal strings.

Reject **extending** `POST /v1/auth/register` with `account_kind` for this slice.

Both paths: single transaction tenant + Owner principal; global email uniqueness (A6); **409** `email_in_use`; **400** `password_too_short`; company missing legal → **400** `validation_error` (E33); individual must **not** accept/require legal fields (`additionalProperties: false`).

### 3. Principal shape and session

- Login role for self-registered user remains **`owner`** (A90). Capabilities gated by **`account_kind`**, not a new role.
- `GET /v1/me` **must** include `account_kind`.
- Auth success `principal` on **company register**, **individual register**, **login**, **totp/verify** (and any other principal-bearing auth success) **should** include `account_kind` so clients can branch before a follow-up `me`.
- Access token claims: existing ADR-002 claims **plus** `account_kind` on newly issued access tokens (login, register*, totp/verify, refresh rotation). Authorization for Drivers/Admins still loads tenant kind server-side (fail closed).

### 4. Authorization matrix (additions)

| Surface | Company Owner | Company Admin | Individual Owner | Driver |
| --- | --- | --- | --- | --- |
| Vehicles details / home / mileage | Yes | Yes | Yes (own tenant) | No (existing 403) |
| Vehicle side images `PUT/DELETE …/sides/*` | Yes | Yes | **403** `forbidden` (E80) | 403 |
| Vehicle handovers history `GET …/handovers*` | Yes | Yes | **403** `forbidden` (E80) | 403 |
| `GET/POST /v1/admins`, admin mutations | Owner only (existing) | No | **403** `forbidden` (E76) | 403 |
| All `/v1/drivers*` | Owner/Admin | Owner/Admin | **403** `forbidden` (E75) | 403 |
| `/v1/driver/*` (travel, handovers, daily usage) | 403 by role | 403 by role | **403** by role | Yes (company drivers only) |
| Password reset / TOTP | Yes (Owner) | Yes | Yes (Owner) | No TOTP / no reset (existing) |

No new error **codes** for kind denial — reuse **403** `forbidden`. Cross-tenant still **404** `not_found` where applicable (A87).

### 5. Data / Fleet

- Vehicles and related rows stay scoped by `company_id` (= tenant id) for both kinds.
- Individual tenants: no driver principals expected; `GET /v1/home` `driver_count` is **0**.
- Company legal columns on individual tenant: empty/default; not validated on individual create.
- Driver invite accept unchanged; invites only exist on company tenants.

### 6. Module ownership

| Layer | Responsibility |
| --- | --- |
| Identity | Column + backfill; both registers; `me`/principal/`account_kind` claim; Drivers/Admins kind gate |
| Fleet | No new routes; `company_id` scope; Individual Owner vehicle **details** only; side images + handover history require **company** kind |
| Web/mobile | Chooser + individual sign-up; shell from `account_kind`; Individual vehicle form **Details only** (no Images/Handovers tabs) |

## Alternatives

1. **Single register + `account_kind` discriminator** — rejected this slice for compatibility and schema clarity; revisit only if public API churn is acceptable.
2. **New role `individual_owner`** — rejected (A90); keep `owner` + kind.
3. **Rename `company_id` → `tenant_id` in HTTP** — rejected this slice (breaking); document semantic only.
4. **Client-only hide Drivers/Admins** — rejected; violates E75/E76 server authority.

## Consequences

- Backend: migration `account_kind` NOT NULL DEFAULT `'company'`; individual register; contract tests for 403 on drivers/admins when kind=individual; me/register principal fields.
- Frontend: after API, US-77/78/85 + Individual shell (no Drivers/Admins).
- ADR-003 “one company per sign-up” read as **one tenant**; kind discriminates org vs personal.
- Contract: [http-v1.md](../contracts/http-v1.md).

## Revisit when

BA adds Individual→Company convert, second Owner on individual, or global rename of tenant id in the public API.
