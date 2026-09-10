# ADR-007 — Web public entry vs operational home (client routing)

**Status:** Accepted  
**Slice:** public web landing (US-17–US-22; US-23–US-26 addendum)

## Decision

- **`/`** is the **public landing** for a person who is not signed in (identity + Sign in + Create company). No fleet or driver records.
- **`/pricing`** is the **public plan catalog** (static; [ADR-021](ADR-021-public-pricing-page.md)). Same session redirects as `/`.
- **`/home`** is **Owner/Admin operational home** (`GET /v1/home`). Sidebar Home points here.
- Signed-in Owner/Admin hitting `/` **redirects to `/home`**. No signed-in marketing view.
- Signed-in **driver** on `/` **redirects** to `/change-password` if `must_change_password`, else **minimal driver home** (`/driver`). Not marketing landing; not Owner KPIs.
- Driver on Owner `/home` (or other Owner routes) is **E8 denied** in driver chrome — not E7 blanket web ban, not landing, not KPIs.
- Auth canvas (`/sign-in`, `/sign-up`, `/password/*`, driver `/change-password`): **no public header**. Post-login: Owner/Admin → `/home`; driver → `/change-password` or `/driver`.
- Unsigned-in `/drivers`, `/vehicles`, `/admins`, `/security`, `/home`, `/driver` stay **US-15 denied**. Only `/` is landing chrome.
- **HTTP `/v1`:** no new Fastify routes for this routing ADR. Driver web login is allowed (see ADR-002). Session probe remains `GET /v1/me`. Landing copy is client/design-locked.
- **US-23–US-26:** hero + description + static street-map **image** on `/` only. The map is a git-versioned file `apps/web/public/landing/hero-map.svg`, served by Next.js as `/landing/hero-map.svg`. Not a map platform, tile proxy, CMS, or GPS product. Original schematic art (no vehicle pins). OSM caption only if the file is OSM-derived. Image `onError` hides the image (E18); no iframe/SDK fallback.

Four chromes stay separate: public landing, auth canvas, Owner/Admin shell, **driver minimal shell**.

## Alternatives

1. **Session-branched `/`** (landing or home on the same URL) — rejected: dual chrome on one route; easy to flash KPIs or leak `AppShell` into public entry.
2. **Off-root landing** (`/welcome` / `/landing`) with `/` still ops home — rejected: hides public entry or leaves `/` as denied.

## Consequences

- Backend: no-op for this slice. Hero map is a static `img` under `apps/web/public/landing/`.
- Frontend: split routes; implement `/` from [design/pages/landing.md](../../design/pages/landing.md); Owner post-auth → `/home`; driver post-auth → `/change-password` or `/driver`.
- Mobile: driver shell already role-branched; unchanged for this ADR.
- Do not put `publicHeader` on the root layout (auth would inherit it).
- Do not teach `AppShell`’s unsigned-in branch to render the landing.

## Revisit when

Web session is known on first paint (httpOnly cookie; would need ADR-002/005) **and** BA forbids a `/home` hop. A CMS/marketing API is a new BA, not a quiet `/v1/landing`.
