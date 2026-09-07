# ADR-013 — Vehicle side appearance images (Supabase Storage)

**Status:** Accepted  
**Slice:** US-35–US-39 · rules 52–60 · design/pages/vehicles.md Appearance  
**Supersedes:** n/a (extends ADR-001 Fleet; ADR-011 vehicle fields unchanged)

## Context

Owner/Admin may attach optional appearance photos for four sides (**FRONT**, **LEFT**, **RIGHT**, **BACK**). Bytes live in **Supabase Storage**; Postgres stores **references (paths)** only—not file blobs. Compliance document upload remains out of scope (A2). Drivers do not manage images (E38). Create/edit must not require images (rule 57).

## Decision

### 1. Upload ownership — multipart to API (S3 gateway)

**Fleet API owns all Storage access** using the same approach as management-platform (ADR-030): **Supabase Storage S3-compatible gateway** via `@aws-sdk/client-s3` + S3 access keys (`OBJECT_STORAGE_*`).

- Clients (Next.js, Expo) send image bytes only to the API (`multipart/form-data`).
- Clients **never** receive S3 keys / object-storage credentials and never call Supabase Storage directly.
- **Not** `@supabase/supabase-js` for blob I/O.

### 2. Object path and bucket

| | |
| --- | --- |
| Bucket | `vehicle-images` (override with `OBJECT_STORAGE_BUCKET`) |
| Visibility | **Private** |
| Object key | `{company_id}/{vehicle_id}/{side}.{ext}` |
| `side` in key | `front` \| `left` \| `right` \| `back` (lowercase) |
| `ext` | from detected image magic: common image extensions (e.g. `jpg`, `png`, `webp`, `gif`, `heic`, `avif`, `bmp`, `tif`, `ico`, …) |

### 3. Persistence vs URLs

- Postgres stores **storage path** per side (nullable columns).
- **Do not** persist signed URLs as source of truth.
- On Owner/Admin vehicle reads, API generates **signed GET URLs** (TTL ~1 hour) as `side_images.<SIDE>.url`.

### 4. Lifecycle

| Op | Behavior |
| --- | --- |
| **Create vehicle** | Field-only `POST /v1/vehicles`. All side paths null. |
| **Upload / replace** | `PUT /v1/vehicles/:id/sides/:side` after vehicle exists. |
| **Clear** | `DELETE /v1/vehicles/:id/sides/:side`: **DeleteObject** for that side’s path in the bucket, then null DB path. Other sides untouched. Idempotent if empty. |
| **Vehicle field PATCH** | Does **not** accept image bytes or paths from client. |

### 5. Authz

Owner/Admin same company only. Driver → **403** on image write. Cross-company → **404**. Drivers omit side image fields on driver DTOs this slice.

### 6. Validation

Any **image** by content magic (not client Content-Type alone); non-image rejected; max **5 MB**; side enum FRONT|LEFT|RIGHT|BACK.

### 7. Env (same pattern as management-platform ADR-030)

S3-compatible Supabase Storage gateway via `@aws-sdk/client-s3` — **not** `@supabase/supabase-js`.

| Var | Purpose |
| --- | --- |
| `OBJECT_STORAGE_DRIVER` | `supabase` (default) |
| `OBJECT_STORAGE_ENDPOINT` | `https://<ref>.storage.supabase.co/storage/v1/s3` |
| `OBJECT_STORAGE_REGION` | e.g. `eu-west-2` |
| `OBJECT_STORAGE_FORCE_PATH_STYLE` | `true` |
| `OBJECT_STORAGE_ACCESS_KEY_ID` | Storage → S3 → Access keys |
| `OBJECT_STORAGE_SECRET_ACCESS_KEY` | Matching secret (shown once on create) |
| `OBJECT_STORAGE_BUCKET` | Private bucket name (e.g. `vehicle-images` / `fleet-management`) |
| `VEHICLE_IMAGE_SIGNED_URL_TTL_SEC` | Optional signed GET TTL (default 3600) |

## Consequences

- Backend owns Supabase; Frontend uses API multipart + returned URLs only.
- Replace/clear must not present cleared/replaced objects as current (A40).

### 8. Clear UX (presentation only)

Clear **API** is unchanged (`DELETE` + storage cleanup). Owner/Admin clients **must** use icon control + **confirmation modal** before calling clear (**US-37**, **US-40**, A41, rules 61–62). No HTTP contract change.

