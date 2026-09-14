# Driver name prompt

**Stories:** US-121  
**Surfaces:** Web driver shell; mobile driver layout. **Driver only** for the dialog.  
**Purpose:** When `GET /v1/me` returns `driver_name_required: true`, block the driver with a modal to set legal name parts (Architect locks flag + PATCH).

## Layout

- Overlay `surface-overlay`; card `raised` + `shadow-overlay`, max ~400px (`auth-card` width pattern).
- Title **Add your name**; short body that name is required before continuing.
- Fields (stack `gap-2`): **Name** (`first_name`, required), **Last Name** (`last_name`, required), **Second Last Name** (optional).
- Primary **Save** only. **No dismiss** (no Cancel / Escape / backdrop close) until save succeeds.
- Offline: `bannerWarning`; submit disabled.
- After save: dialog closes; driver shell continues.

## A11y

- `role="dialog"` `aria-modal="true"`; focus **Name** on open; labels associated; errors on fields + summary as needed.
- Non-drivers never see prompt (`driver_name_required` false / absent).
