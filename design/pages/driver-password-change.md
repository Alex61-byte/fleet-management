# Driver password change (retired path)

**Status:** **Retired** for this slice.

Temp-password first login and forced change-after-sign-in are **out of scope**. Driver onboarding is **invite accept / set password**.

**Canonical page:** [driver-invite-accept.md](driver-invite-accept.md) (US-09).

| Was | Now |
| --- | --- |
| Sign in with Admin temp password → forced change gate | Invite link/deep link → accept + set own password |
| “Do not reuse the temporary password” | No temp password (E5 retired) |
| `must_change_password` after successful password sign-in | Pending driver **cannot** password-sign-in (E31); flag clears on invite accept |

Do not implement UI from the old forced-change framing. FE should route invite tokens to **Accept invitation**, not this filename’s former layout.
