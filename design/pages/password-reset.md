# Password reset (Owner/Admin)

**Stories:** US-03  
**Density:** Web compact; mobile comfortable.  
**Purpose:** Request reset, then set a new password. Drivers do not gain Owner/Admin access.  
**Chrome:** Unauthenticated [auth canvas](_patterns.md). No sidebar. **No public landing header** — lockup stays inside `authCard` (user lock: header is public landing only).

## Layout — request

Same `authCanvas` + `authCard` as sign-in.

1. `authLockup` — same Fleet mark + wordmark + “Fleet operations”
2. `authTitle` “Reset password”
3. `authCaption` “Password reset is for Owners and Admins.”
4. Email `label` + `input`
5. `buttonPrimary` “Send reset” full width
6. `authLinks` + `link` “Back to sign in” (`min-h-hit`, underline at rest — not caption)

## Layout — set password

Same card chrome.

1. `authTitle` “Set new password”
2. New password, confirm — `label` + `input`
3. `caption` “At least 8 characters”
4. `buttonPrimary` “Update password”

## States

| State | UI |
| --- | --- |
| Loading | Button busy (“Sending…” / “Updating…”); fields disabled |
| Success request | Replace fields with `body` + `caption`: “If this email is an Owner or Admin, you can continue with the reset.” **Same message** whether or not the email exists (no enumeration). Keep `link` back to sign in. |
| Invalid/expired token | `bannerDanger` on set-password card; primary “Request a new reset” |
| Password rule | Field `inputError` + `errorText` |
| Driver or unknown | Same generic success on request; set-password does not sign them in as Owner/Admin |
| Offline | `bannerWarning`; submit `buttonDisabled` |

## Token usage

| Role | Class |
| --- | --- |
| Canvas / card | `authCanvas` `authCard` |
| Lockup | `authLockup` `brandMarkAuth` `authWordmark` |
| Title | `authTitle` |
| Caption | `authCaption` |
| Primary | `buttonPrimary` |
| Link | `link` `linkHover` `linkFocus` `linkPressed` |

## A11y

| Control | Name |
| --- | --- |
| Request screen | Reset password |
| Send | Send reset |
| Set screen | Set new password |
| Update | Update password |
| Back | Back to sign in |

- Safe area + keyboard avoiding.
- Success copy is body text, not a toast.
