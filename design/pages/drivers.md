# Drivers (list, create, edit)

**Stories:** US-07, US-08, US-09a (Should), US-16 (Should), US-27 (Must); **US-83** Company-only; **US-82** Individual denied  
**Rules:** 122, A85; E75, E77  
**Density:** Web compact **table**; mobile comfortable **rows**. **Company** Owner/Admin only.  
**Purpose:** Company driver profiles. **Create with email only** (invite via Resend — **no** temporary password). Edit profile. **Should:** resend invite while pending (US-09a); disable/enable login without delete (US-16). **Must:** hard-delete after confirm (US-27).  
**Chrome:** Authenticated **Company** management shell. Sidebar / tab **Drivers** selected. No search (not in BA). **Individual Owner:** no nav entry; deep link → [denied.md](denied.md) E77 — do not render roster.  
**Parity (A16):** Same list / create / edit / disable / resend / hard-delete flows on web and Company Owner/Admin mobile. Confirm sheet chrome differs by platform; copy, hierarchy, and states match.

## List — web

```
pageHeader
  pageTitle Drivers
  pageSubtitle People who sign in on web or mobile
  pageHeaderActions buttonPrimary Add driver
toolbar
  caption font-tabular “{n} drivers”
tableWrap
  Email | Login status
```

| Column | Class | Content |
| --- | --- | --- |
| Email | `tableCellLink` | Driver email — identity cell; no underline at rest; hover `tableCellLinkHover` |
| Login status | badge + text | `badgeOk` “Can sign in” \| `badgeNeutral` “Invite pending” \| `badgeExpired` “Login disabled” |

Row hover `tableRowHover`; entire row opens edit. Sticky header. **Not** a stack of `raised` cards.

- **Invite pending** = created, no usable password yet (`must_change_password` true). Prefer this label over “Must change password” on the roster.
- **Can sign in** = invite accepted, password set, login allowed.
- **Login disabled** = US-16 off (profile kept).

**Hard delete on list:** **None.** No row action, overflow, or bulk delete. US-27 lives on **edit** only. List only reflects post-delete roster (count / empty).

## List — mobile

`appBarMobile` “Drivers” + Add. `listRow` 56px: email `label`; status `caption` + matching badge. Hairline `border-divider` only. Tap row → edit. **No** swipe-to-delete or row delete control.

## Empty / loading / error (list)

| State | UI |
| --- | --- |
| Empty | `emptyState` title “No drivers yet.” sentence “Add a driver by email. We’ll send an invitation so they can set their own password.” CTA “Add driver” |
| Empty after last hard delete | Same empty state (US-27 success → list with zero rows) |
| Loading | Header + toolbar; 6 skeleton table rows (web) / list rows (mobile) |
| Error | `bannerDanger` |
| Offline | `bannerWarning`; keep rows if shown |
| Unauthenticated | No list (US-15) → [denied.md](denied.md) |

## Create

Push page. Single `panel` (not one card per field). **US-07:** **email only** — no temporary password, no MFA, no Admin-set password. Product attempts Resend invite on success.

| Field | Class | Copy |
| --- | --- | --- |
| Email | `label` `input` | Email |
| Note | `caption` | “We’ll email an invitation so they can set their password (web or mobile).” |
| Submit | `buttonPrimary` | Create driver |

After a prior hard delete, the same email may be used again when free — create is a **new** profile + **new** invite (US-07 / US-27), not restore. No “restore deleted driver” chrome.

### States (create)

| State | UI |
| --- | --- |
| Default | Empty email; Create enabled when email non-empty |
| Loading | Create busy “Creating…”; fields disabled; no double submit |
| Duplicate email (E28) | Email `inputError` “This email cannot be used.” No driver created |
| Success + invite sent | Navigate to **Drivers** list; new row email + `badgeNeutral` “Invite pending”. No toast-only success required |
| Success + invite send failed (E30) | Profile **kept**; stay on create or land on list/edit with `bannerWarning` “Invitation email could not be sent. You can resend from the driver profile.” Row still **Invite pending** |
| Offline | `bannerWarning`; Create `buttonDisabled` |
| Driver or signed-out | No create → [denied.md](denied.md) |

- Duplicate is a **field** error (`inputError` + `errorText`), not `bannerDanger`, unless the API fails for an unrelated reason.
- Do **not** show temporary password, “resend temp”, or password fields on create.
- Do **not** surface `must_change_password` as a form control — implied by success + **Invite pending** badge.

## Edit

Same single `panel` for identity + login + pending invite actions. Hard delete is a **separate** block below — not mixed into Save or login toggle.

```
pageHeader
  pageTitle Edit driver
  pageSubtitle {email} (optional caption)
panel (profile)
  Email …
  [if Invite pending] buttonSecondary Resend invitation   ← US-09a only
  Allow sign-in …   ← US-16 only (web + mobile login)
  buttonPrimary Save driver
── border-divider ──
danger block (remove)
  sectionTitle Remove driver
  caption irreversible copy
  buttonDanger Delete driver   ← opens confirm; does not delete on tap
```

### Profile + invite + login (US-08 / US-09a / US-16)

- Email editable; uniqueness conflict → `inputError`
- **Resend invitation (Should — US-09a):** Show **only** when status is **Invite pending** (no usable password). Control: `buttonSecondary` “Resend invitation” in the profile panel (above or beside Allow sign-in — not in Remove block).
  - **Do not** show resend when status is **Can sign in** (E32 — not a password-reset substitute).
  - **Do not** show “resend temporary password” or any temp-password chrome.
  - Busy: label “Sending…”; control `buttonDisabled` until settle.
  - Success: calm `caption` or non-blocking confirmation in panel — “Invitation sent.” List badge stays **Invite pending**.
  - Send fail (E30): `bannerWarning` “Invitation email could not be sent. Try again.” Profile remains pending.
  - Offline: resend `buttonDisabled` + `bannerWarning`.
- **Should — disable/enable (US-16 only):** “Allow sign-in” — visible label + value text On/Off (not color-only). Controls driver login **and** invite accept on **web and mobile**.
  - Turning **Off** → `buttonDanger` opens **disable** sheet (not the delete sheet):
    - Title: “Disable sign-in?”
    - Body: “The driver profile is kept.”
    - Confirm `buttonDanger` “Disable sign-in” + `buttonSecondary` “Cancel”
  - Turning **On** (re-enable): no destructive sheet; apply with Save or immediate enable per existing edit pattern; status returns to “Can sign in” or “Invite pending” if never accepted.
- Save `buttonPrimary` “Save driver”

### Hard delete (US-27) — placement and hierarchy

| Rule | Spec |
| --- | --- |
| Where | **Edit only**, after profile `panel`, below Save. Not in list, create, or page header. |
| Separation | Hairline `border-divider` + gap-2; own `sectionTitle` “Remove driver”. Not inside the login toggle or resend row. |
| Why heavier than disable | Disable keeps the roster row and says profile is kept. Delete removes the person from the company roster forever in this slice (pending invites end). |
| Trigger | `buttonDanger` “Delete driver” — opens confirm; **never** deletes on first tap. |
| Login state | Same control whether sign-in is On or Off (rule 32). Disabled login is **not** a substitute for delete. |
| Copy on page | `caption` under title: “Permanently remove this driver from your company. This cannot be undone.” |
| Do not | Bundle delete into Save; use the disable sheet for delete; show vehicle/fleet side effects (none in this slice); soft-delete / undo / recycle bin. |

### Confirm sheet — hard delete

Reuse sheet pattern: overlay `bg-surface-overlay` + `raised` `shadow-overlay` panel. Actions `min-h-hit` (44pt).

| Element | Spec |
| --- | --- |
| Title | “Delete driver?” |
| Body | “{email} will be removed from your company. They cannot sign in. This cannot be undone.” Optional second `caption` line: “To add them later, create a new driver.” |
| Confirm | `buttonDanger` “Delete permanently” (not “Disable sign-in”, not “Delete”) |
| Cancel | `buttonSecondary` “Cancel” — closes sheet; profile unchanged; focus returns to “Delete driver” trigger |
| Busy | Confirm label “Deleting…”; confirm + cancel `buttonDisabled` until settle; no double submit |
| Web | Modal dialog semantics (see A11y). Centered panel. |
| Mobile | Same copy and actions; sheet anchored per platform (bottom sheet or centered card) — still focus-trapped while open. |

**Disable sheet vs delete sheet (do not merge)**

| | Disable (US-16) | Hard delete (US-27) |
| --- | --- | --- |
| Opens from | Allow sign-in → Off | “Delete driver” in Remove block |
| Title | Disable sign-in? | Delete driver? |
| Body stress | Profile **kept** | Profile **removed**; cannot be undone |
| Confirm label | Disable sign-in | Delete permanently |
| Success | Stay on edit/list; row remains; badge “Login disabled” | Leave edit → **driver list**; row gone |

## States (edit)

| State | UI |
| --- | --- |
| Loading (profile) | Header real; `skeleton` fields in panel; Remove / resend not actionable until loaded |
| Other company / not found after race | Denied or calm empty; **no** email leak; no delete control with foreign data → [denied.md](denied.md) |
| Driver or signed-out | No edit / no delete → [denied.md](denied.md) |
| Resend success (pending only) | Stay on edit; optional “Invitation sent.”; badge **Invite pending** |
| Resend hidden (accepted) | No resend control (E32) |
| Disable success | Status updates on list/detail; profile **remains**; badge “Login disabled” |
| Re-enable | Can sign in again, or still **Invite pending** if never accepted |
| Delete success | Dismiss sheet; navigate to **Drivers** list; toolbar count decrements; if zero → list empty state. No toast-only success. No “Undo”. |
| Delete error | Sheet may close or stay; `bannerDanger` on edit (“Driver could not be deleted.”); profile **still** on screen; trigger enabled again |
| Delete denied (authz) | No success navigation; `bannerDanger` or denied treatment; profile unchanged |
| Offline | Save / disable / resend / delete triggers `buttonDisabled`; `bannerWarning` “You are offline.” |
| Warning | Invite send failure uses `bannerWarning` (E30). Offline uses `bannerWarning`. Irreversible delete is copy, not `badgeWarning`. |

## Token usage

| Role | Class |
| --- | --- |
| Table | `tableWrap` `tableHeaderCell` `tableRow` `tableCell` |
| Mobile row | `listRow` |
| Form | `panel` |
| Pending badge | `badgeNeutral` + text “Invite pending” |
| Can sign in | `badgeOk` |
| Disabled status | `badgeExpired` + text “Login disabled” |
| Resend | `buttonSecondary` (pending only) |
| Remove heading | `sectionTitle` + `caption` |
| Divider before remove | `border-divider` |
| Disable action | `buttonDanger` (login section / disable sheet only) |
| Delete trigger + confirm | `buttonDanger` `buttonDangerHover` (Remove block / delete sheet only) |
| Sheet | `bg-surface-overlay` + `raised` `shadow-overlay` |
| Page error | `bannerDanger` |
| Offline / send fail | `bannerWarning` |
| Busy / offline actions | `buttonDisabled` |

No new color or spacing tokens. No hex. Spacing from existing 8px scale (`gap-2`, `p-3` panel, hairline divider only).

## A11y

| Control | Name |
| --- | --- |
| Screen (list) | Drivers |
| Screen (edit) | Edit driver |
| Add | Add driver |
| Row | {email}, {status} |
| Resend | Resend invitation |
| Toggle | Allow sign-in |
| Disable sheet | Disable sign-in (dialog) |
| Delete trigger | Delete driver |
| Delete sheet | Delete driver (dialog) |
| Delete confirm | Delete permanently |
| Cancel | Cancel |
| Save | Save driver |

### Confirm dialogs (disable + delete)

- Web: `role="dialog"` (or equivalent), modal, `aria-labelledby` → title, `aria-describedby` → body.
- Focus trap while open; initial focus on **Cancel** (safer default) or title — prefer **Cancel** so Enter does not immediately destroy.
- Escape / scrim dismiss = Cancel (no delete).
- Confirm and Cancel both ≥ 44pt; order: Cancel then destructive (or stacked full-width on mobile: destructive last).
- On Cancel: return focus to the control that opened the sheet.
- On delete success: focus moves to list (`Drivers` heading or “Add driver”), not a missing row.
- Status and errors: not color-only; banners in a live region.
- Reduce-motion: sheet appear/dismiss instant; no success confetti or slide flourish.

## Affordance hierarchy (summary)

1. **Save driver** — `buttonPrimary` (constructive, top of actions in profile panel).  
2. **Resend invitation** — secondary; **pending only**; not destructive.  
3. **Allow sign-in / Disable sign-in** — operational; reversible; body stresses profile **kept**.  
4. **Delete driver / Delete permanently** — last on page; irreversible copy; separate block; strongest confirm label.

Never style delete as primary brand. Never hide delete only behind disable. Never use one sheet for both disable and delete. Never offer temp password or “resend temp.”
