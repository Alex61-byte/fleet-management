# TOTP settings (enable / disable)

**Stories:** US-04, US-05, **US-80** (Individual Owner)  
**Surfaces:** Web compact (nav **Security**); mobile management More → Security. **Company** Owner/Admin and **Individual** Owner.  
**Purpose:** Optional authenticator MFA for **this** management principal only (not drivers).  
**Chrome:** Authenticated management shell ([_patterns.md](_patterns.md)) — Individual reaches Security without Drivers/Admins nav.

## Layout — web

```
shell
  sidebar  Security selected
  content
    pageHeader
      pageTitle Security
      pageSubtitle Authenticator app for this account only
    panel (single raised form — not stacked cards)
```

## Layout — mobile

`appBarMobile` title “Security”. No extra card around the status row.

## Status region (inside `panel`)

| Element | Class | Copy |
| --- | --- | --- |
| Overline | `overline` | Authenticator app |
| Status | `badgeNeutral` “Off” or `badgeOk` “On” **plus** text | Never color-only |
| Body | `body` `text-text-secondary` | See Off / On |

**When Off**

- Body: “Sign-in uses email and password only.”
- `buttonPrimary` “Turn on authenticator”
- After tap: setup block in the **same** `panel` (divider `border-divider`). Until Confirm succeeds, status stays **Off** (pending setup is not On).

**Setup block — web**

| Element | Spec |
| --- | --- |
| Intro | `body` / `caption`: “Scan this QR with your authenticator app.” |
| QR | Client-rendered from `otpauth_url` (API already returns it). Square, high contrast on `surface-raised`. Min **160×160** CSS px; quiet zone inside. `img` or canvas with accessible name **Authenticator setup QR code**. Do not show the raw `otpauth_url` string. |
| Secret | Label `caption` “Or enter this key manually”; value selectable `text-table font-tabular` (base32 `secret`). |
| Code | `input` “Authenticator code” + `buttonPrimary` “Confirm” |

**Setup block — mobile (easy path; no camera QR scan required)**

| Element | Spec |
| --- | --- |
| Intro | `body`: “Add Fleet to your authenticator app, then enter the 6-digit code.” |
| Primary action | `buttonPrimary` **Open authenticator app** — opens `otpauth_url` via system URL handler so Google Authenticator / Authy / etc. can import the account when installed. If open fails, keep secret path visible (no dead end). |
| Copy key | `buttonSecondary` **Copy setup key** — copies `secret` to clipboard; brief confirmation `caption` “Key copied”. |
| Secret | Always visible selectable `text-table font-tabular` under label “Setup key” for apps that only support manual entry. |
| Code | `input` “Authenticator code” + `buttonPrimary` “Confirm” |

Do **not** require scanning a QR on the same phone (awkward). Optional small QR on tablet is out of scope for this slice.

**When On**

- Body: “Sign-in also asks for an authenticator code.”
- `buttonDanger` “Turn off authenticator”
- Confirm sheet (`shadow-overlay`): current authenticator code field + `buttonDanger` “Turn off” + `buttonSecondary` “Cancel”

## States

| State | UI |
| --- | --- |
| Loading | `pageHeader` real; `skeleton` status row + 2 lines in panel |
| Error | `bannerDanger`; status unchanged |
| Offline | `bannerWarning`; actions `buttonDisabled` |
| Denied | Driver never sees this nav item |
(web) | Authenticator setup QR code |
| Open app (mobile) | Open authenticator app |
| Copy key (mobile) | Copy setup key |

- Secret also selectable text for VoiceOver / TalkBack.
- Sheet actions 44pt; focus trap in sheet (web).
- QR is decorative-with-name only when secret text is also present (dual channel)
| --- | --- |
| Page | `page` + shell |
| Header | `pageHeader` `pageTitle` `pageSubtitle` |
| Form | `panel` |
| Status Off | `badgeNeutral` |
| Status On | `badgeOk` |

## A11y

| Control | Name |
| --- | --- |
| Screen | Security |
| Turn on | Turn on authenticator |
| Confirm | Confirm authenticator |
| Turn off | Turn off authenticator |
| Cancel | Cancel |
| QR | Authenticator setup image |

- Secret also selectable text for VoiceOver.
- Sheet actions 44pt; focus trap in sheet.
