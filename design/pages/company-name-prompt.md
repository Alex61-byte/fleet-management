# Company name prompt (legacy)

**Stories:** US-01 (legacy name backfill)  
**Rules:** 49, A29a, E33a  
**Surfaces:** Web Owner/Admin shell; mobile Owner tabs. **Owner only** for the dialog.  
**Purpose:** When `GET /v1/me` returns `company_name_required: true`, block Owner with a modal to set company display name via `PATCH /v1/company/name`.

## Layout

- Overlay `surface-overlay`; card `raised` + `shadow-overlay`, max ~400px.
- Title **Add company name**; body explains one-time need.
- Field **Company name** + primary **Save company name**.
- **No dismiss** (no Cancel / Escape close) until saved — name is required.
- Offline: warning banner; submit disabled.
- After save: dialog closes; sidebar may show company name caption.

## A11y

- `role="dialog"` `aria-modal="true"`; focus name field on open.
- Admin never sees prompt (`company_name_required` false).
