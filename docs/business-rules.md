# Business rules — first slice

Testable rules for company access, drivers, and fleet records. Assumptions are marked.

## Rules

1. **Company creation:** Completing sign-up with **email**, **password**, **company registration number**, **VAT number**, and **address** creates one **company** (with those company fields stored) and one **Owner** who can sign in with that email and password **(A29)**.
2. **Roles this slice:** Only **Owner** and **Admin** (company users) and **Driver** (driver profile). No dispatcher, no mechanic.
3. **Who creates whom:** Sign-up creates the first Owner. **Owner** creates additional **Admins**. **Owner and Admin** create and manage **drivers** (invite) and **fleet**.
4. **Surfaces:** Owner/Admin may use **web** and **mobile**. **Drivers** may use **web and mobile** for **invite accept / set password**, subsequent login, and **minimal driver home** (including **next-travel vehicle selection + odometer**). Drivers still do **not** use Owner/Admin management UI (fleet create/edit, driver admin, Admins, TOTP settings).
5. **One mobile product:** Same mobile app; after login the experience is **driver** or **Owner/Admin** by role. Not two store listings.
6. **Login identity uniqueness:** Each login email is unique across login identities **(A6)**.
7. **Owner/Admin MFA:** TOTP via authenticator app is **optional** per Owner/Admin user. No SMS. Drivers have **no MFA** in this slice.
8. **MFA at sign-in:** If TOTP is enabled for that Owner/Admin, sign-in is not complete until a valid authenticator code is provided.
9. **Password reset:** An Owner/Admin who is not signed in can request a password reset and set a new password. Reset applies to Owner/Admin, not drivers **(A9)**.
10. **Driver create (invite):** Owner/Admin creates a driver with **email only** (no temporary password). The product creates a driver principal for the company with **`must_change_password: true`** and **no usable password** until invite accept **(A15, A28)**.
11. **Invitation send:** On create, the product **must** attempt to send an invitation email via **Resend** containing an opaque invite link/token **(A27)**. Send failure does **not** delete the profile; Admin is informed and may retry (**A26**, rule 48).
12. **Invite token:** Each pending invite has an **opaque token**, **single-use** on successful accept, **TTL 7 days** from issue; **resend rotates** the token and restarts TTL **(A24)**.
13. **Invite accept / set password:** Driver opens the invite (web link or mobile deep link / equivalent token path), and sets a **new password** (≥ 8). Accept requires valid token bound to that driver email. On success: password stored, token consumed, **`must_change_password` false**, driver may use **minimal driver home on that surface** **(A15, A25)**.
14. **Unknown email cannot continue:** A person whose email is **not** a pending invited driver with a valid accept path **must not** complete invite accept or password setup on **web or mobile** **(A25)**. Normal sign-in with unknown email still fails (E2).
15. **Disable driver login:** Owner/Admin **should** be able to disable a driver’s ability to sign in **without deleting** the driver profile **(Should, A7)**. Disable is **not** hard delete **(25–26)**. Pending invite does not bypass disable: disabled driver cannot accept or sign in.
16. **Last Owner:** An Owner **cannot** be removed/deleted if they are the last Owner for that company **(A5)**.
17. **Vehicle record:** A vehicle belongs to the company. Fields in this slice: **make** and **model** (Admin-entered free text, not a catalog), **license plate**, **insurance** date(s), **inspection** date(s) the Admin says are needed, **country of registration**, **road tax** date(s). Country is a **value the Admin enters**, not a catalog of laws **(A12)**. Make and model are both required on create.
18. **Compliance storage:** The product stores the dates the Admin enters. **No** built-in legal catalog. **No** document file upload in this slice **(A2)**.
19. **Expiry warning:** If **insurance, inspection, or road tax** date is **within 30 days** of today or **already past**, the product **warns** on that vehicle/date **(A1)**. **`registration_on` is not warned** (optional stored date only; not compliance expiry).
20. **Unauthorized — driver:** A signed-in **driver** cannot open Owner/Admin screens (company user management, creating Admins, fleet setup/edit, driver-profile administration).
21. **Unauthorized — not signed in:** A person who is not signed in cannot open fleet records or driver administration. (Invite accept is a dedicated unauthenticated-or-pre-auth flow; it does not grant fleet/admin access.)
22. **Company isolation:** Owner/Admin only see and change **their company’s** drivers and vehicles **(A8)**.
23. **Admin creation:** Only an **Owner** can create Admins. An Admin cannot create another Admin **(A10)**.
24. **Expired dates on save:** A vehicle can still be saved if a date is expired or inside the warning window; the warning still shows **(A11)**.
25. **Hard delete driver:** Owner/Admin **must** be able to **permanently remove** a driver profile for **their company**. This is **not** the same as disable login **(Must, A17)**.
26. **Delete vs disable:** Disable keeps the profile and blocks sign-in **(15, US-16)**. Hard delete **removes** the profile and login identity so the driver no longer appears in company driver administration **(A17)**. Pending invites for that identity end with delete.
27. **Irreversible:** Hard delete **cannot** be undone in this slice. No restore of the same profile **(A17)**. Re-adding the person means **create driver** again **(US-07)** (new invite).
28. **Sessions after delete:** After hard delete, that person **cannot** remain signed in as that driver and **cannot** complete a new sign-in as that deleted identity.
29. **Email after delete:** When the driver identity is removed, that **email is no longer a login identity** and **may** be used on a later create (driver/Admin/Owner per existing uniqueness **A6**), subject to normal create rules.
30. **No vehicle cascade on driver delete:** Hard delete does **not** create, change, or delete vehicle records. Active next-travel selections for that driver are cleared. Delete does not cascade fleet master data **(A19)**.
31. **Who may delete:** **Owner and Admin** may hard-delete drivers in their company. Drivers and unsigned-in users may not. Cross-company delete has no effect **(A8, 22)**.
32. **Disabled then delete:** A driver with login already disabled **may** still be hard-deleted.
33. **Edit vehicle prepopulate:** Opening **edit** for a company vehicle shows current stored make, model, license plate, country of registration, and each section date (empty control only if that date is null) **(A21)**. **Create** does not prepopulate from another vehicle.
34. **Vehicles nav urgency:** On Owner/Admin **web side nav** and **mobile tab bar**, the **Vehicles** item uses fleet-wide worst-wins over non-null **`insurance_on`, `inspection_on`, `road_tax_on`** only (not `registration_on`), UTC calendar `daysUntil` per ADR-004 **(A20, A22)**:
    - **Red** if any section has **`daysUntil &lt; 7`** (0–6 days left or overdue).
    - **Orange** if no red condition and any section has **`daysUntil = 7`**.
    - **None** otherwise (all null, or all `daysUntil &gt; 7`).
    Red overrides orange. Drivers and unauthenticated users do not get this chrome. Does not change the 30-day list/detail warnings (rule 19).
35. **Stay signed in:** After successful sign-in, the person **remains signed in** across app/browser restarts on web and mobile until absolute session end, explicit sign-out, or a rule that ends the session **(Must, US-29)**.
36. **Access token expiry:** Expiry of the short-lived access token does **not** end the signed-in state. The product **must** obtain a new access token using the valid refresh token without asking for email/password again **(Must, US-29)**.
37. **Absolute session lifetime:** A sign-in session lasts at most **14 days** from the **start of that session’s refresh-token family** (first refresh token issued at login / completed TOTP / successful **invite accept that issues a session** / password change that issues a new family). After 14 days, refresh fails and the person must sign in again **(Must, US-29)**.
38. **Explicit sign-out:** The person **may** sign out at any time **on the current client**. After sign-out on that client they are not signed in there until they complete sign-in again. Sign-out does **not** end sessions on other devices or surfaces **(Must, US-30)**.
39. **Session ends without waiting 14 days:** Refresh-token **reuse** or **family revoke**, **disabled** driver login, **hard-deleted** principal, or other existing auth fail-closed rules end the session immediately (rules 15, 28; E10, E14). Absolute 14-day cap does not extend a revoked or invalid session.
40. **Parallel sessions:** The same login identity **may** be signed in on **more than one device or surface at once** (e.g. two phones, or **web and mobile**). Each successful sign-in starts its **own** refresh-token family with its **own** 14-day clock. Refresh or sign-out on one family does **not** end the others **(Must, US-30)**. Owner/Admin and **Driver**: web + mobile (and multi-device).
41. **No single-session lockout:** A new sign-in does **not** revoke other active sessions for that principal. Global “sign out everywhere” is **out of this slice**.
42. **Password strength:** Minimum password length is **8 characters** for company sign-up, Owner/Admin passwords, and driver password on invite accept **(A4)**.
43. **Later driver logins:** After invite accept (password set), the driver signs in with email and the **current** password on **mobile or web**; they are not forced through invite accept again.
44. **Pending driver cannot password-sign-in:** While `must_change_password` is true and no password has been set, email/password sign-in **fails**; the driver must use the **invite accept** path **(A15)**.
45. **No temporary passwords:** The product **must not** require or accept an Admin-set temporary password for creating or onboarding drivers in this slice **(A28)**.
46. **Invite email match:** Accept flow may collect or display email; continuation is allowed only when the email matches the pending invited driver bound to the valid token **(A25)**.
47. **Expired or invalid invite:** Expired, unknown, reused, or revoked invite tokens **cannot** be used to set a password **(E27)**.
48. **Resend invitation (Should):** Owner/Admin **should** be able to resend invite for a company driver who is still pending accept (`must_change_password` true, no password set). Resend **rotates** token and **restarts** 7-day TTL; attempts Resend email again **(A24, A26)**.
49. **Company legal fields:** **Registration number** and **VAT number** are required non-empty strings on company create **(A29)**.
50. **Company address:** **Address** is required on company create as formatted text (and optional structured parts only if needed for lookup UX). Lat/lon optional **(A30)**.
51. **Address lookup:** Clients **may** use free OpenStreetMap/Nominatim-style lookup to assist address entry. Lookup is **assistive**, not a paid API requirement. Failure of lookup must not block typing a valid address manually **(A30, A31)**.

### Retired (do not implement)

| Former | Status |
| --- | --- |
| Driver temp password set by Admin | **Retired** — replaced by rules 10–14, 42–48 |
| First login with temp password | **Retired** — replaced by invite accept (US-09) |
| Temp password reuse ban (A3) | **Retired** — no temp password |

## Exceptions / unhappy paths

| ID | Situation | Expected business outcome |
| --- | --- | --- |
| E1 | Sign-up email already used | Company/Owner is **not** created; person is told they cannot use that email. |
| E2 | Sign-in with wrong email/password | Access denied; not signed in. |
| E3 | Owner/Admin TOTP enabled, code missing or wrong | Sign-in not completed. |
| E4 | *(Retired)* Driver uses temp password after change. **Superseded** by invite model (no temp password). |
| E5 | *(Retired)* Driver keeps temp as new password. **Superseded** — no temp password. |
| E6 | Driver (or any) password shorter than minimum on set/accept | Change/accept rejected. |
| E7 | *(Retired)* Former “driver cannot use web at all.” **Superseded:** drivers **may** complete invite accept and minimal home on web. Owner/Admin-area denial remains **E8**. |
| E8 | Driver opens Owner/Admin areas (web or mobile) | Denied; stay in driver experience / minimal home. |
| E9 | Not signed in, open fleet | Denied. |
| E10 | Disable driver (Should) then driver signs in or accepts invite | Sign-in/accept rejected; profile still exists. |
| E11 | Attempt to remove last Owner | Rejected. |
| E12 | Vehicle saved with a date already expired or inside 30 days | Record can still be saved; **warning** is shown. |
| E13 | Hard-delete company driver | Profile gone from roster; cannot sign in; invites for that identity void; not recoverable as same profile. |
| E14 | Sign-in after hard delete (same credentials/identity) | Access denied; no driver session. |
| E15 | Create driver with email of previously deleted driver | Allowed if email is free **(A6)**; **new** profile + **new** invite (US-07). |
| E16 | Driver / unsigned-in / other-company attempts delete | No delete. |
| E17 | Delete driver — vehicles | Vehicles unchanged. |
| E18 | All section dates null or all `daysUntil &gt; 7` | Vehicles nav **no** urgency background. |
| E19 | Mix of day-3 and day-7 sections | Vehicles nav **red** (worst-wins). |
| E20 | Edit open, vehicle load fails | No fabricated prepopulated values; error/denied. |
| E21 | Access token expired on one client; refresh still valid and younger than 14 days | New access (and rotated refresh) issued; person stays signed in. |
| E22 | Refresh attempted after 14-day absolute session lifetime | Session ends; person must sign in again (not treated as wrong password). |
| E23 | Explicit sign-out | That client’s session cleared; other devices/surfaces stay signed in if their families are still valid. |
| E24 | Same principal signed in on web and mobile (or two devices) | Both sessions work independently; each has its own 14-day family lifetime. |
| E25 | Sign-in on a second device while first is still signed in | First session remains valid; no forced logout of the first. |
| E26 | Invite accept attempted with email that is not a pending invited driver / unknown in system | **Cannot continue**; no password set; no session as driver. |
| E27 | Invite token missing, malformed, expired, already used, or revoked | Accept rejected; no password set. |
| E28 | Create driver with email already a login identity | No driver created **(A6)**. |
| E29 | Invite accept password &lt; 8 characters | Accept rejected; invite remains valid until TTL/use rules say otherwise. |
| E30 | Resend fails on create (or resend) after profile exists | Driver profile **remains** pending invite; Owner/Admin **sees send failure**; can retry resend (**Should**). Not a silent success. |
| E31 | Pending driver tries normal email/password sign-in before accept | Access denied; must use invite accept **(rule 44)**. |
| E32 | Resend invite for driver who already accepted (password set) | No new invite required for onboarding; resend pending-only (no re-open of accepted invite as temp-password substitute). |
| E33 | Sign-up missing registration number, VAT, or address (or password &lt; 8) | Company/Owner **not** created. |
| E34 | Address lookup unavailable or returns no results | User may still enter address as free text; sign-up not blocked solely by lookup failure **(rule 51)**. |

41. **Next-travel vehicle selection (Must):** A signed-in **driver** may select **one** vehicle from **their company’s** fleet as the vehicle for their **next travel**, and must enter a current **odometer** reading at selection time **(A33)**.
42. **One active selection:** At most **one** active next-travel selection per driver. Selecting again **replaces** the previous active selection (history of prior selections may be kept for audit) **(A33)**.
43. **Odometer unit from country:** Odometer unit is **not** chosen by the driver. It is derived from the vehicle’s **country of registration**:
    - **Miles** when country normalizes to a miles-using jurisdiction (US/USA/United States, GB/UK/United Kingdom, LR/Liberia, MM/Myanmar and common aliases) **(A34)**.
    - **Kilometres** for all other non-empty countries, and when country is empty/unknown (default km) **(A34)**.
44. **Odometer value:** Reading is a non-negative number (up to 1 decimal place allowed). Unit label shown to the driver must match rule 43. Server stores **value + unit** used at save time **(A33)**.
45. **Driver vehicle list:** Drivers may **list** company vehicles (identity + plate + country + derived unit) for selection only. Drivers **cannot** create, edit, or delete vehicles **(20, A33)**.
46. **Company isolation (driver travel):** Driver only sees and selects vehicles in **their** company **(A8)**. Cross-company vehicle ids are not_found/forbidden.
