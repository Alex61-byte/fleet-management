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
| 409 | `daily_usage_no_active_travel` | Daily usage create without active next-travel (E59) |
| 429 | `rate_limited` | Login/forgot/invite preview·accept (backend should apply) |
| 502 or 503 | `storage_unavailable` | Supabase Storage upload/delete/sign failed (vehicle side images) |

**Retired codes (must not be returned):** `password_reused`, `password_change_required`, `driver_web_not_allowed`.

Messages for `invalid_credentials` and `password/forgot` success must not distinguish unknown email vs bad password (except register `email_in_use` per E1).  
Invite: `invite_invalid` for token problems; `email_not_invited` only when token is valid but email wrong — do **not** reveal other companies’ or users’ data.

---

## Unauthenticated

### `POST /v1/auth/register`

**Story:** US-01  
**Account kind:** always creates tenant `account_kind = "company"`.  
**Backward compatible:** body and validation unchanged (ADR-010 / ADR-018).  
**Must not** accept `account_kind` (kind fixed to company).

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
  "principal": {
    "id": "uuid",
    "email": "...",
    "role": "owner",
    "company_id": "uuid",
    "account_kind": "company"
  },
  "access_token": "...",
  "refresh_token": "...",
  "must_change_password": false
}
```

**409** `email_in_use`. **400** `password_too_short` | `validation_error`.

### `POST /v1/auth/register/individual`

**Stories:** US-78 (entry US-77)  
**Account kind:** always creates tenant `account_kind = "individual"`.  
**ADR:** [ADR-018](../adr/ADR-018-account-kinds.md).

```json
{
  "email": "person@example.com",
  "password": "string min 8"
}
```

**Must not** require or persist registration number, VAT, or address (A83). Extra properties (including legal fields) → **400** `validation_error`.

**201**

```json
{
  "principal": {
    "id": "uuid",
    "email": "...",
    "role": "owner",
    "company_id": "uuid",
    "account_kind": "individual"
  },
  "access_token": "...",
  "refresh_token": "...",
  "must_change_password": false
}
```

| Failure | HTTP | code |
| --- | --- | --- |
| Password &lt; 8 | 400 | `password_too_short` |
| Missing/invalid email or body | 400 | `validation_error` |
| Email already a login identity | 409 | `email_in_use` |

Same session issuance rules as company register (new refresh family, US-30).

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

**200**

```json
{
  "id": "uuid",
  "email": "...",
  "role": "owner",
  "company_id": "uuid",
  "account_kind": "company",
  "must_change_password": false,
  "login_enabled": true,
  "totp_enabled": false
}register/individual`, `totp/verify`, `invite/accept` each issue a **new** refresh family (US-30).

Auth success `principal` objects (register*, login, totp/verify, invite/accept) include `account_kind`. Drivers are always `"company"` when present.

### TOTP

`GET /v1/auth/totp`, `POST setup|confirm|disable` — Owner/Admin as before (both account kinds).

---

## Admins

### `GET /v1/admins` / `POST /v1/admins`

Owner create rules unchanged for **company** tenants. Create: `{ email, password }`.

| Caller | Result |
| --- | --- |
| Company Owner | Existing behavior |
| Company Admin / Driver | **403** `forbidden` (existing) |
| **Individual Owner** (any admin route) | **403** `forbidden` (E76, A84) |

---

## Drivers

**Company tenants only.** Owner or Admin on `account_kind = company`. Drivers: **403**.

| Caller | Result |
| --- | --- |
| Company Owner/Admin | Existing behavior |
| Driver | **403** `forbidden` |
| **Individual Owner** (list/create/patch/resend/delete) | **403** `forbidden` (E75, A85) |
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
Owner/Admin of **either** account kind may use vehicle routes for **their** tenant. Individual has no drivers; vehicle isolation still `company_id` (A87).


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
  "mileage": 12345.5,
  "mileage_unit": "km",
  "insurance_on": "2026-01-15",
  "inspection_on": null,
  "road_tax_on": "2026-03-01",
  "registration_on": "2020-06-01",
  "custom_expirations": [
    { "id": "uuid", "label": "Fire extinguisher", "expires_on": "2026-09-20" }
  ],
  "warnings": [
    { "field": "custom:<uuid>", "state": "due_soon" }
  ],
  "has_side_images": true,
  "side_images": {
    "FRONT": {
      "path": "{company_id}/{vehicle_id}/front.jpg",
      "url": "https://<supabase-signed-get>"
    },
    "LEFT": null,
    "RIGHT": {
      "path": "{company_id}/{vehicle_id}/right.webp",
      "url": "https://<supabase-signed-get>"
    },
    "BACK": null
  }
}
```

| Field | Notes |
| --- | --- |
| `make` | Required on create; non-empty trimmed string |
| `model` | Required on create; non-empty trimmed string |
| `license_plate` | Required on create; non-empty trimmed string |
| `mileage` | Optional current odometer reading on the **vehicle** record. `null` = unknown. When set: number ≥ 0, max 1 decimal (same parse as driver travel odometer). **Not** driver_travel odometer. |
| `mileage_unit` | Read-only on responses: `"mi"` \| `"km"` derived from `country_of_registration` (A34). **Not** accepted on write. Always present on Vehicle reads. |
| dates / country | Optional; null allowed |
| `custom_expirations` | Always present on reads (min `[]`). Items: `{ id, label, expires_on }` with `expires_on` = `YYYY-MM-DD`. Max **10**. Labels unique per vehicle (trim, case-insensitive), length 1–80 after trim. [ADR-019](../adr/ADR-019-vehicle-custom-expirations.md). |
| `warnings` | Server-computed on reads: insurance/inspection/road_tax **and** `custom:<uuid>` for each custom row in the A1 window. **`registration_on` never.** Same UTC 30-day rule (ADR-004). |
| `has_side_images` | `true` if any side has a stored path (**Should** list presence cue) |
| `side_images` | Always keys `FRONT` \| `LEFT` \| `RIGHT` \| `BACK`. Empty: `null`. Filled: `{ "path", "url" }` (`path` = Storage key; `url` = signed GET ~1h) |
| Image bytes | **Not** on POST/PATCH vehicle. Upload only via side routes after vehicle exists |

**Removed:** `car`. Storage: [ADR-013](../adr/ADR-013-vehicle-side-images.md). Mileage: [ADR-014](../adr/ADR-014-vehicle-mileage.md). Custom expirations: [ADR-019](../adr/ADR-019-vehicle-custom-expirations.md). Owner/Admin only; drivers **403** on fleet vehicle + image routes.

### `GET /v1/vehicles` · `GET /v1/vehicles?expiring=true`
`{ "items": Vehicle[] }` — each item includes `mileage`, `mileage_unit`, `custom_expirations`, `has_side_images` and `side_images`. `expiring=true` filters `warnings.length > 0` (includes custom-only warnings).

**Owner/Admin Global Header notifications (US-68–US-76 / ADR-017; custom **Could** US-89 / ADR-019):** **No** `GET /v1/notifications`. Clients project menu items from this list’s server `warnings[]` via `@fleet/sdk` (`complianceNotificationItems`). HTTP surface unchanged.

### `POST /v1/vehicles`
Body: `make`, `model`, `license_plate` required; optional country, date fields, `mileage` (`number` \| `string` \| `null`; omit or null = unknown), and optional `custom_expirations` array (full list; omit = `[]`). **No** image parts. **No** `mileage_unit` on write. **201** Vehicle with empty sides and `custom_expirations` (minted ids when omitted). **400** `validation_error` if make/model/plate missing or blank after trim, mileage invalid (negative / non-numeric / >1 decimal), or custom expirations invalid (not array, >10, bad label/date/id, duplicate labels/ids).

### `GET /v1/vehicles/:id` · `PATCH /v1/vehicles/:id`
PATCH body: write fields only (make, model, plate, country, dates, `mileage`, `custom_expirations`). Clear mileage with `null` or empty string. **`custom_expirations` when present = full replace**; omit = leave unchanged; `[]` = clear. Item: `{ id?: string\|null, label, expires_on }`; server mints UUID when `id` omitted/null. **Must not** accept `mileage_unit`, `side_images`, paths, or files. **200** Vehicle. **404** other company / missing.

### `PUT /v1/vehicles/:id/sides/:side`

Upload or **replace** one side. `:side` = `FRONT` \| `LEFT` \| `RIGHT` \| `BACK`.

| | |
| --- | --- |
| Body | `multipart/form-data` file field **`file`** |
| Types | Any **image** detected by file magic (`image/*`); non-image → `validation_error` |
| Max size | **5 MB** |

**200** Vehicle. **400** `validation_error` (bad side/type/size/missing file). **403** driver **or** Individual Owner (`account_kind = individual`, E80). **404** other company. **502/503** `storage_unavailable` — prior side unchanged. Company Owner/Admin only.

Object key: `{company_id}/{vehicle_id}/{side_lower}.{ext}` in bucket `vehicle-images`.

### `DELETE /v1/vehicles/:id/sides/:side`

Clear **one** side: delete that side’s object from Supabase Storage (S3 `DeleteObject` on the stored path) and null the DB path. Other sides unchanged. Idempotent if already empty. **200** Vehicle (`side_images.<SIDE>` = `null`). Same authz as PUT (Company Owner/Admin only; Individual **403**). **502/503** `storage_unavailable` if the object could not be removed — DB path unchanged so the product does not claim empty while the blob may still exist.

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

## Env (Fleet — vehicle side images)

| Var | Purpose |
| --- | --- |
| `OBJECT_STORAGE_DRIVER` | `supabase` (default; same as management-platform) |
| `OBJECT_STORAGE_ENDPOINT` | Supabase Storage S3 gateway, e.g. `https://<ref>.storage.supabase.co/storage/v1/s3` |
| `OBJECT_STORAGE_REGION` | e.g. `eu-west-2` |
| `OBJECT_STORAGE_FORCE_PATH_STYLE` | `true` for Supabase S3 gateway |
| `OBJECT_STORAGE_ACCESS_KEY_ID` | Storage → Configuration → S3 → Access keys |
| `OBJECT_STORAGE_SECRET_ACCESS_KEY` | Matching secret — **API only**; not a service_role JWT |
| `OBJECT_STORAGE_BUCKET` | Private bucket (default `vehicle-images`) |
| `VEHICLE_IMAGE_SIGNED_URL_TTL_SEC` | Optional. Default `3600` (presigned GET lifetime) |

Image routes use `@aws-sdk/client-s3` against Supabase Storage S3 (management-platform approach). Dev/test may inject a fake storage port; if unset/misconfigured and no fake, image upload/clear/sign → `storage_unavailable`. Field-only vehicle CRUD does not require object storage.

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
  "mileage": 12345.5,
  "mileage_unit": "km",
  "odometer_unit": "km",
  "label": "Ford Transit"
}
```

| Field | Notes |
| --- | --- |
| `mileage` | Optional vehicle master mileage (`null` if unknown). Read-only for drivers. |
| `mileage_unit` | Same derivation as `odometer_unit` / A34. |
| `odometer_unit` | `"mi"` or `"km"` — server-derived from `country_of_registration` (A34). Not client-chosen. Used for next-travel odometer entry. |
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

**Mileage:** `PUT /v1/driver/travel` **must not** update `vehicles.mileage` (A43 / ADR-014). Handover Out/In **does** set `vehicles.mileage` (A52 / ADR-015).

## Vehicle handovers (US-51–US-60)

Fleet. See [ADR-015](../adr/ADR-015-vehicle-handovers.md).  
Damage bytes: same Supabase S3 gateway as side images ([ADR-013](../adr/ADR-013-vehicle-side-images.md)); keys under `{company_id}/{vehicle_id}/handovers/{handover_id}/{image_id}.{ext}`.

### Error codes (handover)

| BA | HTTP | `error.code` |
| --- | --- | --- |
| E45 | 409 | `handover_no_active_travel` |
| E46 | 409 | `handover_vehicle_open` |
| E47 | 409 | `handover_driver_open` |
| E48 | 409 | `handover_no_open_out` |
| E49 | 409 | `handover_wrong_driver` |
| E50–E53 | 400 | `validation_error` |
| E54 / E55 | 403 | `forbidden` |
| E56 | 404 | `not_found` |
| E57 | — | No PATCH/DELETE routes |
| E58 | 503 | `storage_unavailable` |

### Handover list item

```json
{
  "id": "uuid",
  "vehicle_id": "uuid",
  "company_id": "uuid",
  "type": "out",
  "status": "open",
  "handover_out_id": null,
  "driver": { "id": "uuid", "email": "driver@fleet.example" },
  "mileage": 12010.5,
  "mileage_unit": "km",
  "next_service_days": 30,
  "next_service_distance": 500.0,
  "next_service_distance_unit": "km",
  "damages_text": null,
  "damage_image_count": 0,
  "created_at": "2026-09-07T10:00:00.000Z",
  "closed_at": null,
  "voided_at": null
}
```

| Field | Notes |
| --- | --- |
| `type` | `out` \| `in` |
| `status` | `open` \| `closed` \| `voided` (In is always `closed` at create) |
| `handover_out_id` | Set on In → paired Out id; `null` on Out |
| `driver` | `{ id, email }` or `null` if principal removed after hard-delete |
| `mileage_unit` / `next_service_distance_unit` | Frozen at write from vehicle country (A34). Not client-supplied |
| `damage_image_count` | List convenience; detail expands images |

### Handover detail

List fields plus `damage_images[]` (`id`, `path`, `url` signed on Owner/Admin detail, `sort_order`), optional `vehicle` summary, optional `paired_out` on In.

### `GET /v1/driver/handovers/active`

Driver only. Owner/Admin → **403** `forbidden`.

**200** `{ "handover": HandoverActive | null }` — caller’s open Out, else `null` (US-60).

### `POST /v1/driver/handovers`

Driver only. Owner/Admin → **403** `forbidden` (E54).  
`Content-Type: multipart/form-data`.

| Part | Required | Notes |
| --- | --- | --- |
| `type` | yes | `out` \| `in` (lowercase) |
| `mileage` | yes | ≥ 0; max 1 decimal |
| `next_service_days` | yes | integer ≥ 1 |
| `next_service_distance` | yes | ≥ 0; max 1 decimal |
| `damages_text` | no | optional string |
| `damages` | no | file field repeated (0..10). Image by magic; max **5 MB** |

**Not accepted:** `vehicle_id`, unit fields, paths.

**Vehicle** = caller’s active next-travel selection only.

**201** HandoverDetail. Side effects: persist Out (`open`) or In (`closed` + Out → `closed`); set `vehicles.mileage` = submitted mileage.

**Errors:** see table above (E45–E54, E58).

### `GET /v1/vehicles/:vehicleId/handovers`

Company Owner/Admin same tenant. Driver → **403** (E55). Individual Owner → **403** (E80). Other company / missing vehicle → **404** (E56).

**200** `{ "items": HandoverListItem[] }` newest first (`created_at` DESC). Includes voided and closed.

### `GET /v1/vehicles/:vehicleId/handovers/:handoverId`

Company Owner/Admin same tenant. Individual Owner → **403** (E80). **200** HandoverDetail with signed damage image URLs. **404** if handover not on that vehicle/company.

## Driver Daily usage (US-61–US-67)

Fleet. See [ADR-016](../adr/ADR-016-driver-daily-usage.md).  
Day-use log against **active next-travel** vehicle. **Does not** update `vehicles.mileage` (A62). **Does not** create/close handovers (A57).

### Error codes (daily usage)

| BA | HTTP | `error.code` |
| --- | --- | --- |
| E59 | 409 | `daily_usage_no_active_travel` |
| E60 / E64 | 403 | `forbidden` |
| E61–E63 | 400 | `validation_error` |
| E65 | — | No PATCH/DELETE routes |
| E66 | 404 | `not_found` |
| E67 | — | Client-only offline submit block |

### Daily usage resource

```json
{
  "id": "uuid",
  "vehicle_id": "uuid",
  "usage_date": "2026-09-07",
  "start_place": "Depot A",
  "start_distance": 12010.5,
  "end_place": "Site B",
  "end_distance": 12085.0,
  "distance_unit": "km",
  "start_time": "08:30",
  "end_time": "17:15",
  "created_at": "2026-09-07T10:00:00.000Z",
  "vehicle": {
    "id": "uuid",
    "make": "Ford",
    "model": "Transit",
    "license_plate": "B-01-FLE",
    "label": "Ford Transit"
  }
}
```

| Field | Notes |
| --- | --- |
| `usage_date` | Calendar day `YYYY-MM-DD` (local day as entered; no TZ field) |
| `start_time` / `end_time` | Local wall-clock `HH:mm` (24h); `end_time >= start_time` |
| `start_distance` / `end_distance` | ≥ 0, max 1 decimal; `end_distance >= start_distance`; if vehicle master mileage set, `start_distance >= mileage` at create |
| `distance_unit` | `"mi"` \| `"km"` frozen at write from vehicle country (A34). **Not** accepted on write |
| `vehicle` | Summary at read time (label = make + model). Row keeps `vehicle_id` even if travel selection later changes |
| Places | Non-empty after trim |

### `GET /v1/driver/daily-usage`

Driver only. Owner/Admin → **403** `forbidden` (E64).

**200** `{ "items": DailyUsage[] }` — **own** rows only, newest first (`created_at` DESC). Empty list → `{ "items": [] }`.

### `POST /v1/driver/daily-usage`

Driver only. Owner/Admin → **403** `forbidden` (E60).  
`Content-Type: application/json`.

```json
{
  "usage_date": "2026-09-07",
  "start_place": "Depot A",
  "start_distance": 12010.5,
  "start_time": "08:30",
  "end_place": "Site B",
  "end_distance": 12085.0,
  "end_time": "17:15"
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `usage_date` | yes | `YYYY-MM-DD` |
| `start_place` | yes | non-empty string |
| `start_distance` | yes | number \| numeric string; ≥ 0; max 1 decimal |
| `start_time` | yes | `HH:mm` |
| `end_place` | yes | non-empty string |
| `end_distance` | yes | same parse as start; must be ≥ start |
| `end_time` | yes | `HH:mm`; must be ≥ start_time |

**Not accepted:** `vehicle_id`, `distance_unit`, `company_id`, `driver_id`.

**Vehicle** = caller’s active next-travel selection only.

**201** DailyUsage. Side effects: insert row only. **`vehicles.mileage` unchanged.**

**Errors:**

| Condition | HTTP | code |
| --- | --- | --- |
| No active next-travel | 409 | `daily_usage_no_active_travel` |
| Missing/blank fields, bad date/time format | 400 | `validation_error` |
| Distance negative / non-numeric / >1 decimal / end &lt; start / start &lt; vehicle.mileage | 400 | `validation_error` |
| end_time &lt; start_time | 400 | `validation_error` |
| Owner/Admin | 403 | `forbidden` |

**Default “today”** is a **client** prefills concern; API does not inject date if omitted (omission → validation_error).
