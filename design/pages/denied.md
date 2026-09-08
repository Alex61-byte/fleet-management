# Denied and unauthenticated

**Stories:** US-14, US-15, E8, E9 (Admin create denial US-06); **US-82 / E75–E77** (Individual → Company-only)  
**Density:** Matches host surface (web compact / mobile comfortable).  
**E7 retired:** Do **not** use a “driver on web” blanket deny. Drivers may complete usable auth + minimal home on web. Owner/Admin **management** areas stay denied via **US-14 / E8**. Individual Owner **Drivers/Admins** (and driver-ops shells) denied via **E77** — hide nav when possible; still deny deep links.

Authorization is **calm ops copy**, not a crash. Do not use `bannerDanger` / `danger` chrome for authz destinations.

## Layout (all variants)

Prefer auth-style or empty-canvas — never a table skeleton of real records.

```
bg-canvas min-h-full
  centered column max-w-auth-card px-2
    authLockup Fleet + Fleet operations (same mark as auth; not FLEET overline)
    pageTitle / authTitle
    body text-text-secondary (one sentence)
    buttonPrimary
    optional buttonSecondary / link
```

On **driver shell** (web or mobile), keep the driver app bar if already in the driver app; message in a single `panel` under the bar — **never** flash Owner sidebar/tabs while denying.

## Unauthenticated (US-15)

- Do **not** render vehicle or driver records (no empty list of real data).
- Title “Sign in required”
- Body “Fleet and driver records are only available after you sign in.”
- `buttonPrimary` “Sign in” → [sign-in.md](sign-in.md)

## Driver → Owner/Admin (US-14 / E8)

Applies when a **driver** (including `must_change_password` still true) opens Owner/Admin routes: home KPIs, Drivers, Vehicles, Admins, Security/TOTP settings, create Admin, fleet create/edit — on **web or mobile**.

- Stay in **driver shell** (no Owner sidebar / tab bar flash).
- Title “Not available”
- Body “This area is for Owners and Admins.”
- `buttonPrimary` “Back to home”
  - If invite accepted (`must_change_password` false) → [driver-home.md](driver-home.md)
  - If still pending invite (`must_change_password` true, no password) → [sign-in.md](sign-in.md) or calm “use your invitation link” copy — **not** home; do **not** route to retired [driver-password-change.md](driver-password-change.md). Canonical accept: [driver-invite-accept.md](driver-invite-accept.md) only with a valid token
- No peek of Admin forms, vehicle fields, or expiry tables.

## Admin → Create Admin (US-06)

- Title “Not allowed”
- Body “Only the Owner can add Admins.”
- `buttonSecondary` back (keep Owner shell chrome if already authenticated as Admin)

## Individual Owner → Company-only (US-82 / E75–E77)

Applies when a signed-in **Individual Owner** opens **Drivers** admin, **Admins**, driver invite/create/delete, or **driver-ops** shells (next-travel / handover create / Daily usage as a driver product) — web or mobile, including deep links.

- Stay in **Individual management shell** (Home / Vehicles / Security only). **Do not** flash Company Drivers/Admins nav items while denying.
- Title **“Not available”**
- Body **“Drivers and Admins are available on company accounts only.”**
- `buttonPrimary` **“Back to home”** → [owner-home.md](owner-home.md) Individual home
- Optional `buttonSecondary` **“View vehicles”** → [vehicles.md](vehicles.md) when the denied target was driver-related
- No peek of driver roster, Admin create form, or invite controls
- API still denies (E75/E76); UI hide is not the only control

| Denied target | Body emphasis |
| --- | --- |
| Drivers list/create/invite | Default body above |
| Admins list/create | Default body above (E76) |
| Driver-ops shell | Same title; body may stay default — do not invent a second product |

## Token usage

| Role | Class |
| --- | --- |
| Page | `page` `bg-canvas` |
| Lockup | `authLockup` (same Fleet mark + wordmark; not `FLEET` overline) |
| Title | `authTitle` / `pageTitle` |
| Body | `body` + `text-text-secondary` |
| Primary | `buttonPrimary` |
| Secondary | `buttonSecondary` |
| Optional text action | `link` (underline at rest), never caption-only |

Do **not** use `danger` for authorization.

## A11y

| Screen | Name |
| --- | --- |
| US-15 | Sign in required |
| US-14 | Not available |
| US-06 | Not allowed |
| US-82 / E77 | Not available |
| Primary | Sign in / Back to home |

- Announce the denied title. Focus the primary button.
- No live “assertive” error tone; this is a destination, not a field error.
