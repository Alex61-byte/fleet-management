# HTTP `/v1` contract — first slice

Base: `/v1`. JSON. Fastify JSON Schema in implementation must match this document.

Authenticated routes: header `Authorization: Bearer <access_token>`.

## Error envelope

```json
{
  "error": {
    "code": "invalid_credentials",
    "message": "Sign-in details are not correct."
  }
}
```

| HTTP | code | When |
| --- | --- | --- |
| 400 | `validation_error` | Schema fail (incl. empty/overlong company legal fields) |
| 400 | `password_too_short` | Length &lt; 8 |
| 400 | `reset_invalid` | Bad/expired reset token |
| 400 | `invite_invalid` | Bad/expired/used/revoked invite token, or missing token |
| 400 | `email_not_invited` | Invite token **valid** but submitted email does not match the pending invited driver (E26) |
| 400 | `totp_not_pending` | Confirm without setup |
| 401 | `unauthenticated` | Missing/expired access |
| 401 | `invalid_credentials` | Login mismatch **or** pending driver (no password set) attempting password login (E31) |
| 401 | `totp_invalid` | Missing/wrong TOTP |
| 403 | `forbidden` | Role cannot perform action |
| 403 | `login_disabled` | Driver login disabled (sign-in **or** invite accept) |
| 404 | `not_found` | Wrong id or other company |
| 409 | `email_in_use` | Register, create admin, create/edit driver |
| 409 | `invite_not_pending` | Resend when driver already accepted / has password set (E32) |
| 429 | `rate_limited` | Login/forgot/invite preview·accept (backend should apply) |

**Retired codes (must not be returned):** `password_reused`, `password_change_required`, `driver_web_not_allowed`.

Messages for `invalid_credentials` and `password/forgot` success must not distinguish unknown email vs bad password (except register `email_in_use` per E1).  
Invite: `invite_invalid` for token problems; `email_not_invited` only when token is valid but email wrong — do **not** reveal other companies’ or users’ data.

---

## Unauthenticated

### `POST /v1/auth/register`

**Story:** US-01

```json
{
  "email": "owner@fleet.example",
  "password": "string min 8",
  "registration_number": "string non-empty max 64",
  "vat_number": "string non-empty max 64",
  "address": "string non-empty max 500"
}
```

Trim legal fields before emptiness checks. Address text only (no lat/lon). Missing/empty/overlong → **400** `validation_error` (E33).

**201**

```json
{
  "principal": { "id": "uuid", "email": "...", "role": "owner", "company_id": "uuid" },
  "access_token": "...",
  "refresh_token": "...",
  "must_change_password": false
}
```

**409** `email_in_use`. **400** `password_too_short` | `validation_error`.

### `POST /v1/auth/login`

**Stories:** US-02, US-10

```json
{ "email": "...", "password": "...", "client": "web" }
```

`client`: `web` | `mobile`.

**200** authenticated or totp_required (Owner/Admin).

**Pending driver** (no password set): **401** `invalid_credentials` (E31). Do **not** issue tokens.

### `POST /v1/auth/totp/verify`

```json
{ "challenge_token": "...", "code": "123456" }
```

**200** authenticated Owner/Admin. **401** `totp_invalid`.

### `POST /v1/auth/refresh`

```json
{ "refresh_token": "..." }
```

**200** `{ access_token, refresh_token }`. **401** `unauthenticated`.

### `POST /v1/auth/password/forgot`

```json
{ "email": "..." }
```

**202** `{}` always. Owner/Admin only (A9).

### `POST /v1/auth/password/reset`

```json
{ "token": "...", "password": "min 8" }
```

**204**. **400** `reset_invalid` | `password_too_short`.

### `POST /v1/auth/invite/preview`

**Story:** US-09

```json
{ "token": "opaque" }
```

**200** `{ "email": "driver@example.com", "expires_at": "ISO-8601" }`

**400** `invite_invalid`. **403** `login_disabled` when token otherwise valid but driver disabled.

### `POST /v1/auth/invite/accept`

**Story:** US-09

```json
{
  "token": "opaque",
  "email": "driver@example.com",
  "password": "min 8",
  "client": "web"
}
```

**200**

```json
{
  "status": "authenticated",
  "principal": { "id": "", "email": "", "role": "driver", "company_id": "" },
  "access_token": "",
  "refresh_token": "",
  "must_change_password": false
}
```

| Failure | HTTP | code |
| --- | --- | --- |
| Bad/expired/used token | 400 | `invite_invalid` |
| Token valid, email mismatch | 400 | `email_not_invited` |
| Password &lt; 8 | 400 | `password_too_short` |
| Disabled | 403 | `login_disabled` |

### ~~`POST /v1/auth/password/change-first`~~ — **RETIRED**

---

## Authenticated identity

### `GET /v1/me`

**200** `{ "id", "email", "role", "company_id", "must_change_password", "login_enabled", "totp_enabled" }`

### `POST /v1/auth/logout`

```json
{ "refresh_token": "..." }
```

**204**. Revokes presented family only (US-30).

### Session issuance

`login`, `register`, `totp/verify`, `invite/accept` each issue a **new** refresh family (US-30).

### TOTP

`GET /v1/auth/totp`, `POST setup|confirm|disable` — Owner/Admin as before.

---

## Admins

### `GET /v1/admins` / `POST /v1/admins`

Unchanged. Create: `{ email, password }`.

---

## Drivers

Owner or Admin. Drivers: **403**.

### Driver object

```json
{
  "id": "uuid",
  "email": "...",
  "must_change_password": true,
  "login_enabled": true
}
```

**Invite pending:** `must_change_password === true` (no usable password).

### `GET /v1/drivers` → `{ items: [driver] }`

### `POST /v1/drivers`

```json
{ "email": "..." }
```

No `temporary_password`. Creates pending driver + invite (TTL 7 days, hash stored). Attempts Resend after commit.

**201**

```json
{
  "id": "uuid",
  "email": "...",
  "must_change_password": true,
  "login_enabled": true,
  "invite_email_sent": true
}
```

**409** `email_in_use`.

### `GET|PATCH /v1/drivers/:id`

PATCH: `{ email?, login_enabled? }`.

### `POST /v1/drivers/:id/invite/resend`

**200** `{ "invite_email_sent": true|false }`  
**409** `invite_not_pending`. **404** other company.

Allowed while login disabled (accept still blocked).

### `DELETE /v1/drivers/:id`

**204** hard delete. Invite material removed with principal.

---


## Vehicles / home

### Vehicle resource

```json
{
  "id": "uuid",
  "company_id": "uuid",
  "make": "Ford",
  "model": "Transit",
  "license_plate": "B-01-FLE",
  "country_of_registration": "RO",
  "insurance_on": "2026-01-15",
  "inspection_on": null,
  "road_tax_on": "2026-03-01",
  "registration_on": "2020-06-01",
  "warnings": []
}
```

| Field | Notes |
| --- | --- |
| `make` | Required on create; non-empty trimmed string |
| `model` | Required on create; non-empty trimmed string |
| `license_plate` | Required on create; non-empty trimmed string |
| dates / country | Optional; null allowed |
| `warnings` | Server-computed on reads (insurance/inspection/road_tax only) |

**Removed:** `car`.

### `GET /v1/vehicles` · `GET /v1/vehicles?expiring=true`
`{ "items": Vehicle[] }`

### `POST /v1/vehicles`
Body: `make`, `model`, `license_plate` required; optional country + date fields. **201** Vehicle. **400** `validation_error` if make/model/plate missing or blank after trim.

### `GET /v1/vehicles/:id` · `PATCH /v1/vehicles/:id`
PATCH body: any subset of write fields. **200** Vehicle. **404** other company / missing.

### `GET /v1/home`
```json
{
  "driver_count": 0,
  "vehicle_count": 0,
  "expiring_vehicles": [
    { "id": "uuid", "make": "Ford", "model": "Transit", "license_plate": "B-01-FLE", "warnings": [] }
  ]
}
```

---

## Env (Identity)

| Var | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM` | From address (verified domain) |
| `PUBLIC_WEB_URL` | Base for invite links, e.g. `https://app.example` → `/invite?token=` |
| `PUBLIC_MOBILE_INVITE_SCHEME` | Optional deep link scheme prefix |

If Resend is unset, create still succeeds with `invite_email_sent: false` (dev). Tests may inject a fake mailer.

## Driver next travel (US-33 / US-34)

Driver-only. Owner/Admin → **403** `forbidden`. Drivers remain **403** on owner fleet write routes.

### Driver vehicle list item

```json
{
  "id": "uuid",
  "make": "Ford",
  "model": "Transit",
  "license_plate": "B-01-FLE",
  "country_of_registration": "RO",
  "odometer_unit": "km",
  "label": "Ford Transit"
}
```

| Field | Notes |
| --- | --- |
| `odometer_unit` | `"mi"` or `"km"` — server-derived from `country_of_registration` (A34). Not client-chosen. |
| `label` | `"Make Model"` convenience |

**Miles** when normalized country is one of: `us`, `usa`, `united states`, `united states of america`, `gb`, `uk`, `united kingdom`, `great britain`, `lr`, `liberia`, `mm`, `myanmar`, `burma`. **Else km** (including empty/null).

### Travel resource

```json
{
  "id": "uuid",
  "vehicle_id": "uuid",
  "odometer": 12345.5,
  "odometer_unit": "km",
  "created_at": "2026-04-01T12:00:00.000Z",
  "vehicle": {
    "id": "uuid",
    "make": "Ford",
    "model": "Transit",
    "license_plate": "B-01-FLE",
    "label": "Ford Transit"
  }
}
```

### `GET /v1/driver/vehicles`
`{ "items": DriverVehicle[] }` — all company vehicles (read-only).

### `GET /v1/driver/travel`
`{ "travel": Travel | null }` — active selection for the signed-in driver.

### `PUT /v1/driver/travel`
Body: `{ "vehicle_id": "uuid", "odometer": number | string }`

- **200** Travel (new active row; prior active deactivated).
- **400** `validation_error` — missing vehicle_id; odometer missing/negative/non-numeric; more than 1 decimal place on string input.
- **404** `not_found` — vehicle not in driver company.
- Unit stored from vehicle country at write time (not from body).

Odometer: ≥ 0; max 1 decimal; values may be sent as number or numeric string.
