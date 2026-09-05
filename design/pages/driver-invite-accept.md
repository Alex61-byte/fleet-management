# Driver invite accept / set password

**Stories:** US-09 (replaces retired temp-password first-login gate)  
**Density:** Web **compact** auth card; mobile **comfortable** auth card. **Same flow on both surfaces.**  
**Purpose:** Invited driver opens invite (web query token or mobile deep link), confirms email, sets **own** password (≥ 8). On success → [driver-home.md](driver-home.md) on **this surface**.  
**Chrome:** Unauthenticated [auth canvas](_patterns.md). Not Owner shell. Not driver home chrome. No “Create company”, no Forgot password, no TOTP, no temp-password framing.  
**Parity:** Field inventory, validation copy, block states, and success destination match web ↔ mobile. Only density/chrome spacing differs.

**Retired:** Temp-password first login and [driver-password-change.md](driver-password-change.md) forced-change-after-sign-in framing. Do not route pending drivers through password sign-in first.

## Layout

```
pageAuth + authCanvas
  authCard (web: max-w-auth-card centered; mobile: full width in px-2 under safe area)
    authLockup Fleet + Fleet operations
    authTitle Accept invitation
    authCaption Set your password to continue.
    token from query / deep link (not a visible secret field)
    fields
    buttonPrimary Set password
```

- No tabs. No skip / “later”. No Owner nav / sidebar.
- Token: read from URL query or mobile deep link — **not** shown as a password-style field; do not echo full token in UI.
- Primary full width in the card (mobile: sticky above home indicator if keyboard hidden).

## Fields

| Field | Class | Notes |
| --- | --- | --- |
| Email | `label` + `input` **or** read-only `label` + `body`/`caption` | Display and/or confirm. Must match pending invite bound to token (A25). Email keyboard if editable |
| Password | `label` + `input` | Secure; `caption` “At least 8 characters.” |
| Confirm password | `label` + `input` | Secure; mismatch → `inputError` |
| Submit | `buttonPrimary` full width | Busy “Saving…”; disabled when token/email path is blocked (see states) |

- Optional short `caption`: “Use the email from your invitation.”
- **No** “temporary password” caption or reuse rule (E5 retired).

## States

| State | UI |
| --- | --- |
| Default (valid token path) | Email shown/confirmable; password fields empty; Set password when both passwords non-empty (length still validated on submit) |
| Loading (accept) | Save busy “Saving…”; fields disabled; stay on canvas |
| Loading (resolving token) | Card with lockup + `skeleton` or calm `caption` “Checking invitation…”; no password submit yet |
| Unknown email / email mismatch (E26) | **Cannot continue:** password fields and submit **not** actionable (hidden or `buttonDisabled`). Calm `bannerDanger` or `authCaption` + `errorText`: “This invitation is not valid for that email.” No session. No home |
| Invalid / missing / expired / used token (E27) | **Cannot continue:** same block pattern. Copy: “This invitation link is invalid or has expired.” Optional `authLinks` `link` “Back to sign in” → [sign-in.md](sign-in.md). No password set |
| Password &lt; 8 (E29) | Password `inputError` + `errorText` “Password must be at least 8 characters.” Stay; no home |
| Confirm mismatch | Confirm `inputError` + `errorText` “Passwords do not match.” |
| Login disabled (E10) | Accept rejected; `bannerDanger` “Sign-in is disabled for this account.” Profile exists but no session/home |
| Success | Token consumed; `must_change_password` false → [driver-home.md](driver-home.md) **on this surface**. No MFA step |
| Offline | `bannerWarning`; Set password `buttonDisabled` |
| No MFA | Never show TOTP on this flow (US-09) |
| Deep-link / Owner URL | Do not show Owner chrome; stay on this accept canvas or calm block until success (then minimal driver home only) |

### Continue vs block

| Condition | Password form | Primary |
| --- | --- | --- |
| Valid token + email matches pending invite | Shown | Enabled when passwords filled |
| Unknown email / mismatch (E26) | Blocked | Disabled / hidden |
| Bad token (E27) | Blocked | Disabled / hidden |
| Disabled driver (E10) | May show until submit fails **or** block after resolve — prefer clear banner + no success path | No home on failure |

## Token usage

| Role | Class |
| --- | --- |
| Canvas / card | `authCanvas` `authCard` |
| Lockup | `authLockup` `brandMarkAuth` `authWordmark` “Fleet” `authCaptionLockup` “Fleet operations” |
| Title | `authTitle` |
| Caption | `authCaption` / field `caption` |
| Errors | `inputError` `errorText` for field rules; `bannerDanger` for E26/E27/E10 path blocks |
| Offline | `bannerWarning` |
| Save | `buttonPrimary` / busy + `buttonDisabled` when offline or blocked |
| Escape link | `authLinks` + `link` “Back to sign in” when token path is dead |

No new tokens. Same auth + form semantics as other auth canvas pages.

## A11y

| Control | Name |
| --- | --- |
| Screen | Accept invitation |
| Email | Email |
| Password | Password |
| Confirm | Confirm password |
| Submit | Set password |
| Back | Back to sign in |

- Field errors: associate `errorText` with inputs; announce via live region on submit failure.
- Blocked invite: assertive/polite live region for the reason; focus title or banner, not a dead submit.
- Safe area (mobile); keyboard avoiding; 44pt Set password; focus ring `inputFocus` / `buttonFocus`.
- Reduce-motion: no celebratory success animation — navigate to minimal driver home on **this surface**.
- Do not expose raw invite token in accessible name or visible text.
