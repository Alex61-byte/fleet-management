# Business rules — first slice

Testable rules for company access, drivers, and fleet records. Assumptions are marked.

## Rules

1. **Company creation (Company path):** Completing **Company** sign-up with **email**, **password**, **company registration number**, **VAT number**, and **address** creates one **company** tenant (`account_kind = company`, with those company fields stored) and one **Owner** who can sign in with that email and password **(A29)**. See also **117–120** for account kinds and Individual create.
2. **Roles this slice:** **Owner** and **Admin** (company users), **Driver** (company driver profile), and **Individual Owner** (Owner on `account_kind = individual`). Admin and Driver **only** on Company tenants. No dispatcher, no mechanic.
3. **Who creates whom:** **Company** sign-up creates first Company Owner. **Individual** sign-up creates sole Individual Owner. **Company Owner** creates Admins. **Company Owner and Admin** create/manage drivers and company fleet. **Individual Owner** manages **own** vehicles only—**not** drivers or Admins **(A84–A86)**.
4. **Surfaces:** Owner/Admin may use **web** and **mobile**. **Drivers** may use **web and mobile** for **invite accept / set password**, subsequent login, and **minimal driver home** (including **next-travel vehicle selection + odometer**, **Handover Out/In**, and **Daily usage**). Drivers still do **not** use Owner/Admin management UI (fleet create/edit, driver admin, Admins, TOTP settings).
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
17. **Vehicle record:** A vehicle belongs to the company. Fields in this slice: **make** and **model** (required free-text strings on the API; clients may offer a static pick list with **Other** free text — not a server catalog), **license plate**, optional **mileage** (current odometer reading; rules **64–71**), **insurance** date(s), **inspection** date(s) the Admin says are needed, **country of registration**, **road tax** date(s). Country is a **value the Admin enters**, not a catalog of laws **(A12)**. Make and model are both required on create.
18. **Compliance storage:** The product stores the dates the Admin enters. **No** built-in legal catalog. **No** compliance **document** file upload (insurance/inspection/tax/registration) **(A2)**. **Vehicle side appearance images** are separate and governed by rules **52–60** **(A35–A40)**.
19. **Expiry warning:** If **insurance, inspection, or road tax** date — or a **custom expiration** `expires_on` — is **within 30 days** of today or **already past**, the product **warns** on that vehicle/date **(A1, A95)**. **`registration_on` is not warned** (optional stored date only; not compliance expiry). Custom warning field key: `custom:<id>` ([ADR-019](adr/ADR-019-vehicle-custom-expirations.md)).
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
30. **No vehicle cascade on driver delete:** Hard delete does **not** create, change, or delete vehicle records. Active next-travel selections for that driver are cleared. That driver’s **Daily usage** rows are **removed**. Delete does not cascade fleet master data **(A19, A69)**.
31. **Who may delete:** **Owner and Admin** may hard-delete drivers in their company. Drivers and unsigned-in users may not. Cross-company delete has no effect **(A8, 22)**.
32. **Disabled then delete:** A driver with login already disabled **may** still be hard-deleted.
33. **Edit vehicle prepopulate:** Opening **edit** for a company vehicle shows current stored make, model, license plate, country of registration, mileage (empty if null), and each section date (empty control only if that date is null) **(A21)**. **Create** does not prepopulate from another vehicle.
34. **Vehicles nav urgency:** On Owner/Admin **web side nav** and **mobile tab bar**, the **Vehicles** item uses fleet-wide worst-wins over non-null **`insurance_on`, `inspection_on`, `road_tax_on`** and **Should (US-89)** each custom `expires_on` (not `registration_on`), UTC calendar `daysUntil` per ADR-004 / ADR-019 **(A20, A22, A97)**:
    - **Red** if any section has **`daysUntil &lt; 7`** (0–6 days left or overdue).
    - **Orange** if no red condition and any section has **`daysUntil = 7`**.
    - **None** otherwise (all null, or all `daysUntil &gt; 7`).
    Red overrides orange. Drivers and unauthenticated users do not get this chrome. Does not change the 30-day list/detail warnings (rule 19).
35. **Stay signed in:** After successful sign-in, the person **remains signed in** across app/browser restarts on web and mobile until absolute session end, explicit sign-out, or a rule that ends the session **(Must, US-29)**.
36. **Access token expiry:** Expiry of the short-lived access token does **not** end the signed-in state. The product **must** obtain a new access token using the valid refresh token without asking for email/password again. Owner/Admin are **not** asked for TOTP on silent refresh; TOTP remains only for full sign-in when enabled (rule 8) **(Must, US-29)**.
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
| E1 | Sign-up email already used | Company **or Individual** Owner is **not** created; person is told they cannot use that email. |
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
| E35 | Side image is not an image type (non-image file) | Upload rejected for that side; no new reference; other vehicle fields unchanged if saved separately. |
| E36 | Side image larger than 5 MB | Upload rejected for that side; prior image for that side kept if any. |
| E37 | Clear side with existing image | Side empty afterward; image no longer shown as current for that vehicle/side. |
| E41 | Cancel or dismiss clear-side confirm | Side image and reference unchanged; no storage delete for that attempt. |
| E38 | Driver, unsigned-in, or other-company image manage | No upload/replace/clear; vehicle images unchanged. |
| E39 | Upload/storage failure after validation | That side not updated to a broken reference; Owner/Admin sees failure; other sides unchanged. |
| E40 | Second file for same side without clear | Treated as **replace** (rule 53); only one current image per side. |
| E42 | Mileage negative, non-numeric, or more than 1 decimal | Vehicle mileage write rejected; validation feedback; no partial bad mileage stored. |
| E43 | Country changed mi↔km with existing mileage number | Number kept as-is; unit label updates; no silent conversion. |
| E44 | Driver / unsigned-in / other-company sets vehicle.mileage | No change; denied / not found. |

41. **Next-travel vehicle selection (Must):** A signed-in **driver** may select **one** vehicle from **their company’s** fleet as the vehicle for their **next travel**, and must enter a current **odometer** reading at selection time **(A33)**.
42. **One active selection:** At most **one** active next-travel selection per driver. Selecting again **replaces** the previous active selection (history of prior selections may be kept for audit) **(A33)**.
43. **Odometer unit from country:** Odometer unit is **not** chosen by the driver. It is derived from the vehicle’s **country of registration**:
    - **Miles** when country normalizes to a miles-using jurisdiction (US/USA/United States, GB/UK/United Kingdom, LR/Liberia, MM/Myanmar and common aliases) **(A34)**.
    - **Kilometers** for all other non-empty countries, and when country is empty/unknown (default km) **(A34)**.
44. **Odometer value:** Reading is a non-negative number (up to 1 decimal place allowed). Unit label shown to the driver must match rule 43. Server stores **value + unit** used at save time **(A33)**.
45. **Driver vehicle list:** Drivers may **list** company vehicles (identity + plate + country + derived unit) for selection only. Drivers **cannot** create, edit, or delete vehicles **(20, A33)**.
46. **Company isolation (driver travel):** Driver only sees and selects vehicles in **their** company **(A8)**. Cross-company vehicle ids are not_found/forbidden.
52. **Vehicle side images (Must):** A company vehicle may have optional appearance images for exactly four sides: **FRONT**, **LEFT**, **RIGHT**, **BACK** **(A35, A36)**.
53. **One per side:** At most **one** image per side. Uploading to a side that already has an image **replaces** it **(A37)**.
54. **Who manages images:** **Owner and Admin** of the vehicle’s company may upload, replace, and clear side images on **web and mobile**. **Drivers** and unsigned-in users may not **(20, 21, A40)**.
55. **Storage:** Image **bytes** are stored in **Supabase Storage**. The product persists **references** (storage path and/or resolvable URL) on the vehicle record—**not** raw file blobs in the application database **(A38)**.
56. **Types and size:** Accepted types: **any image** (`image/*` MIME or equivalent image extension / magic). Max size **5 MB** per file **(A39)**. **Non-image** type or oversize → reject that upload; existing side reference unchanged **(E35, E36)**.
57. **Optional on save:** Vehicle create/edit **must not** require any side image. Missing sides are empty **(A36)**.
58. **Clear side:** Owner/Admin may **clear** a side. **Filled** side: clear runs **only after** confirmation **(61, 62)**. After successful clear, that side has no image in product reads; storage cleanup so the file is not still served as current **(A40, E37)**.
59. **Edit prepopulate (images):** Opening edit shows current side images (or empty slots) for all four sides together with existing vehicle fields **(A21, A40)**.
60. **Company isolation (images):** Side image read/write only for vehicles in the caller’s company **(A8, 22)**. Cross-company → not found / no change **(E38)**.
61. **Confirm before delete (Must, A41):** Any in-product action that **deletes** a **user-visible** asset or record **must** present a **confirmation modal or sheet** and perform the delete **only** after explicit confirm. **Cancel** or dismiss leaves data unchanged. Applies to **driver hard-delete (25–27, US-27)**, **vehicle side image clear (58, US-37)**, and **all future delete features**. One-tap delete without confirm is **not** allowed.
62. **Clear control (side images):** On a **filled** side, clear is offered via an **icon** control whose first activation **opens** the confirm modal—it does **not** clear on that first activation **(US-37, A41)**. Surfaces: **web and mobile**.
63. **Outside rule 61:** Flows that are not “delete asset/record” (e.g. **disable** driver login, TOTP turn-off) follow their own stories. **Replace** side image (53) is not governed as delete-confirm under 61 this slice. **Already-empty** side: no delete confirm required; clear remains **idempotent** **(E37)**.
64. **Vehicle mileage (Must):** A company vehicle may store an optional **current odometer / mileage reading** on the **vehicle record** (fleet master data). This is **not** the driver next-travel odometer row **(A42, A43)**.
65. **Optional:** Create/edit may omit mileage or set it null/empty (**unknown**). Mileage is **not** required to save the vehicle **(A42)**.
66. **Value when provided:** Non-negative number; **at most 1 decimal place** (same parse rules as driver odometer, rule 44). Negative, non-numeric, or >1 decimal → reject that write; other valid fields unchanged if saved separately **(E42)**.
67. **Unit from country (not selectable):** Display and API **`mileage_unit`** are **derived** from `country_of_registration` with the **same** miles vs kilometres rules as odometer unit **(43, A34)**. Clients must not choose or override unit. Product shows one control labeled **Miles** or **Kilometers** accordingly **(A42)**.
68. **Who writes mileage:** **Owner and Admin** of the vehicle’s company may set, change, or clear mileage on create/PATCH (web + mobile fleet UI). **Drivers** and unsigned-in users **must not** write `vehicle.mileage` **(20, 21)**. Driver travel odometer write path is unchanged and separate **(41–44, A43)**.
69. **No automatic overwrite from travel:** Saving driver next-travel selection **must not** update `vehicle.mileage` in this slice **(A43)**. Future link is out of scope / Could.
70. **Country change and unit:** If `country_of_registration` changes so derived unit flips (mi↔km), the **stored number is not auto-converted**; only the unit label/`mileage_unit` changes. Operators may need to re-enter mileage after a country correction **(E43)**.
71. **Read surfaces (Must / Should):** Owner/Admin vehicle **list, detail, create, edit** show mileage when present; edit **prepopulates** stored mileage (empty if null) **(33, A21)**. Driver vehicle list **may** show current vehicle mileage **read-only** (**Should, A44**); drivers still cannot edit vehicles **(45)**.

72. **Handover types (Must):** A vehicle **handover** is either **Out** (vehicle taken into driver custody) or **In** (vehicle returned). Out starts an open custody period; In closes it on the same vehicle **(A45)**.
73. **Eligibility (Must):** Only a signed-in **driver** with usable password (invite accepted) may create handovers. The vehicle must be that driver’s **active next-travel** vehicle and in the **same company** **(A46, 41–46)**. Owner/Admin and unsigned-in users **cannot** create handovers **(E54)**.
74. **Out constraints (Must):** Out is allowed only if the vehicle has **no open Out** and the driver has **no open Out** on any vehicle. Success creates an **open Out** **(A47, E46, E47)**.
75. **In constraints (Must):** In is allowed only if there is an **open Out** on that vehicle **created by this same driver**. Success stores In and **closes** the pair **(A47, E48, E49)**.
76. **Required fields (Must):** On both Out and In: **mileage**, **next_service_days**, **next_service_distance**. **Damages text** optional. **Damage images** optional **(A48, A49)**. Missing/invalid required → reject; no partial row **(E50)**.
77. **Units (Must):** Handover mileage and next_service_distance unit are derived from vehicle **country of registration** with the same miles/km rules as odometer **(43, A34, A51)**. Clients must not choose unit. Value + unit stored at write.
78. **Mileage write-through (Must):** On successful Out or In, set **`vehicle.mileage`** to the handover mileage **(A52)**. Plain next-travel PUT still must **not** update `vehicle.mileage` **(A43, 69)**.
79. **Monotonic mileage (Must):** Handover mileage ≥ 0, max 1 decimal. If `vehicle.mileage` is set, handover mileage must be **≥ vehicle.mileage**. On In, mileage must be **≥** paired Out mileage **(A53, E51)**.
80. **Next service values (Must):** `next_service_days` integer **≥ 1**. `next_service_distance` number **≥ 0**, max 1 decimal **(A54, E52)**.
81. **Damage images (Must):** Up to **10** images per handover; **image** types only; max **5 MB** each. Bytes in object storage; DB stores references linked to **handover** and **vehicle**. Not side-appearance slots and not compliance documents **(A50, A56, E53)**. Prefer **fail closed** if submitted images cannot be stored **(E58)**.
82. **Who reads history (Must):** **Owner and Admin** of the company may list and view handover **history and detail** for company vehicles (read-only). **Drivers** do **not** get the Owner/Admin Handovers tab or other drivers’ full history **(A55, E55)**. Drivers **may** see their **own open Out** / need-to-In cue on driver home **(US-60 Should)**.
83. **History immutability (Must):** No edit or delete of handovers this slice (except closing an open Out via In). No post-submit damage-image remove **(A55, E57)**.
84. **Company isolation (Must):** All handover read/write scoped to caller’s company **(A8, E56)**.
85. **Driver hard-delete and open Out (Must):** If a driver with an **open Out** is hard-deleted, that open Out must be **voided/cancelled** so the vehicle is not stuck open with no completable In. Closed handover history may be retained with driver marked unavailable as implemented **(A19 extended for custody only)**.
86. **Surfaces (Must):** Driver Out/In on **web and mobile** driver experience. Owner/Admin history on **web and mobile** vehicle UI as a **third tab** after Details and Images.

| ID | Situation | Outcome |
| --- | --- | --- |
| E45 | No active next-travel vehicle | Cannot start Out or In; no handover created. |
| E46 | Out while vehicle already has open Out | Rejected; existing open Out unchanged. |
| E47 | Out while driver already has open Out (other vehicle) | Rejected. |
| E48 | In with no open Out for this driver+vehicle | Rejected. |
| E49 | In by different driver than open Out | Rejected. |
| E50 | Missing/invalid required handover fields | Rejected; no partial handover. |
| E51 | Mileage invalid or below monotonic floor (vehicle or Out) | Rejected. |
| E52 | next_service_days or next_service_distance invalid | Rejected. |
| E53 | >10 damage images, non-image, or >5 MB | That upload/handover rejected; no broken references. |
| E54 | Owner/Admin/unsigned-in creates handover | Denied; no handover. |
| E55 | Driver opens Handovers history tab / Owner history APIs | Denied. |
| E56 | Cross-company vehicle/handover id | Not found / no change. |
| E57 | Edit/delete past handover | Not offered; rejected if attempted. |
| E58 | Storage failure on damage image during create | Fail closed; no handover with missing/broken image refs for the submitted set. |

87. **Daily usage (Must):** A **Daily usage** record is a driver-authored log of vehicle use for a **calendar day** against the driver’s **active next-travel** vehicle **(A57)**.
88. **Eligibility (Must):** Only a signed-in **driver** with usable password and an **active next-travel** selection may **create** Daily usage. Vehicle = that selection’s vehicle, same company **(A58, 41–46)**. No next-travel → no create **(E59)**. Owner/Admin/unsigned-in cannot create **(E60)**.
89. **Required fields (Must):** **usage_date**, **start_place**, **start_distance**, **start_time**, **end_place**, **end_distance**, **end_time**. All required. Missing/invalid → reject; no partial row **(A59, E61)**.
90. **Units (Must):** Start/end distance unit from vehicle **country of registration** (rules **43 / A34**). No client unit choice. Store **value + unit** at write **(A60)**.
91. **Distance values (Must):** Start and end distance ≥ 0, max **1** decimal. **end_distance ≥ start_distance**. If `vehicle.mileage` is set, **start_distance ≥ vehicle.mileage** **(A61, E62)**. Daily usage **must not** update `vehicle.mileage` **(A62, 69 extended)**.
92. **Date and times (Must):** `usage_date` is a **local calendar date** (default **today** local on new form). `start_time` / `end_time` are **local wall-clock** times on that date; **end_time ≥ start_time** **(A63, E63)**. Product does not require a timezone control this slice.
93. **Multiplicity (Must):** **Multiple** Daily usage rows per driver per date are **allowed** **(A64)**.
94. **Who reads (Must):** Driver may **list own** Daily usage only (newest first). **No** Owner/Admin Daily usage history UI this slice **(A65, E64)**. Drivers do not see other drivers’ entries.
95. **Immutability (Must):** No edit or delete of Daily usage after successful create this slice **(A66, E65)**.
96. **Company isolation (Must):** Create/list scoped to caller’s company and principal **(A8, E66)**.
97. **Surfaces (Must):** Driver Daily usage on **web and mobile** minimal driver experience; entry from driver **home hub** (opt-in task screen; not auto-opened on login) **(A67)**.
98. **Offline (Must):** When the client is offline, Daily usage **submit is not available** (warn; primary disabled)—same standing pattern as driver handover forms **(A68, E67)**.
99. **Hard delete driver (Must):** Hard-deleting a driver **removes** that driver’s Daily usage records **(A69)**.
100. **Not handover (Must):** Daily usage does **not** create/close Out/In and does **not** require an open Out **(A57)**.

| ID | Situation | Outcome |
| --- | --- | --- |
| E59 | No active next-travel | Cannot create; no row |
| E60 | Owner/Admin/unsigned-in create | Denied; no row |
| E61 | Missing/invalid required fields | Rejected; no partial row |
| E62 | Distance invalid, end &lt; start, or start below vehicle.mileage floor | Rejected |
| E63 | end_time &lt; start_time same usage_date | Rejected |
| E64 | Owner/Admin or other driver reads this driver’s usage APIs/UI | Denied / empty not-found as implemented |
| E65 | Edit/delete existing Daily usage | Not offered; rejected if attempted |
| E66 | Cross-company vehicle/ids | Not found / no change |
| E67 | Offline submit attempt | No create; client blocks submit |

| ID | Assumption |
| --- | --- |
| A57 | Daily usage = day-use **log**, distinct from handover custody and from next-travel selection row |
| A58 | Create allowed only with **active next-travel**; vehicle frozen from that selection at save |
| A59 | Seven fields all **required**; no optional subset this slice |
| A60 | Distance unit = A34 from vehicle country; store value + unit |
| A61 | Monotonic distances: end ≥ start; start ≥ vehicle.mileage when set; ≥0 max 1 decimal |
| A62 | Daily usage **never** writes `vehicle.mileage` (handover remains the write-through path) |
| A63 | Date = local calendar; times = local `HH:mm`; end ≥ start same date; default date = today local |
| A64 | Multiple entries per day allowed |
| A65 | Driver own create/list only; Owner reporting **out** |
| A66 | No edit/delete this slice |
| A67 | Web + mobile driver hub task screen; no auto-open on login |
| A68 | Offline consistent with handover forms |
| A69 | Driver hard-delete removes that driver’s Daily usage rows |



## Global Header and notifications (Owner/Admin)

101. **Global Header audience (Must):** Authenticated **Owner** and **Admin** only, on **Owner/Admin** web and mobile surfaces. **Not** on driver shell, public landing, or unauthenticated auth flows **(A70)**.
102. **Global Header presence (Must):** Every in-scope Owner/Admin page shows the **same** Global Header region (shared chrome), not a one-off per page **(A71)**.
103. **Fleet icon (Must):** Global Header includes the **Fleet** product mark/icon (same product identity language as existing lockup). Decorative vs named control is Design; product name remains **Fleet** **(A72)**.
104. **Notification control (Must):** Global Header includes a **notification icon button** that is always visible in that chrome (enabled when signed in as Owner/Admin) **(A73)**.
105. **Notification menu (Must):** Activating the button **opens** the notification menu; activating again, outside dismiss, or explicit close **closes** it. Only one menu instance **(A73)**.
106. **MVP notification sources (Must):** Menu items in this slice are derived from **existing company vehicle compliance dates** only: **insurance_on**, **inspection_on**, **road_tax_on** when **within 30 days** of today or **already past** (same window as rule **19** / **A1**). **`registration_on` is not** a notification source **(A13, A74)**.
107. **Item grain (Must):** One menu item per **vehicle + section** that meets rule 106 (e.g. plate/make-model + section + status soon/expired). No fabricated items for vehicles with all-null or all outside window **(A75)**.
108. **Ordering (Should):** Show **expired / overdue** before **within-window soon**; then by soonest date; stable tie-break allowed **(A76)**.
109. **Tenancy (Must):** Items only for vehicles in the caller’s **company**. Cross-company data never appears **(22, A8, A77)**.
110. **Authz (Must):** Drivers, other roles, and unsigned-in users do not receive Owner/Admin Global Header or its notification APIs/UI **(20, 21, E8, E9, E68)**.
111. **Read-only menu (Must):** Menu does **not** edit vehicle dates or other records. **Should:** choosing an item **navigates** to that vehicle in Owner/Admin UI **(A78)**.
112. **Relationship to US-28 (Must):** Global Header notifications **complement** Vehicles nav urgency; they do **not** remove or redefine orange/red nav rules **(34)**.
113. **Unread affordance (Should):** If any MVP item exists, icon **may** show a non-color-only cue (count or dot + accessible name). Absence of items → no urgency cue on the icon **(A79)**.
114. **Caps (Must):** Menu lists at most **50** items this slice; if more qualify, show top 50 by rule 108 and do not imply the rest are none **(A80)**.
115. **No push (Won't):** No OS push, email, or SMS for these items in this slice **(A81)**.
116. **Empty/loading/error (Must):** No qualifying items → empty state (not an error). Load failure → error state; prior empty not faked as success **(E69, E70)**.

| ID | Situation | Outcome |
| --- | --- | --- |
| E68 | Driver / unsigned-in seeks OA Global Header or notification menu | Not shown / denied; driver chrome unchanged |
| E69 | Notification list fails to load | Error in menu; no fake compliance rows |
| E70 | Zero vehicles in window | Empty state; icon without unread cue |
| E71 | User opens menu offline (if client knows) | Error or unavailable; no silent stale success required beyond existing app patterns |
| E72 | Navigate to vehicle that was deleted | Normal not-found/denied vehicle path; menu can refresh on next open |

| ID | Assumption |
| --- | --- |
| A70 | Non-driver UI = Owner/Admin web + Owner/Admin mobile only |
| A71 | One shared header chrome component/region for all OA authenticated pages |
| A72 | “Fleet Icon” = existing Fleet mark language (not a new product logo system) |
| A73 | Notification entry is icon button + menu; not a full notifications page this slice |
| A74 | MVP feed = compliance rule 19 only; no new domain events required for MVP |
| A75 | Item = vehicle + section pair in warning/expired state |
| A76 | Urgency-first sort is Should |
| A77 | Strict company isolation |
| A78 | Navigation from item is Should; deep-link target = that vehicle’s OA view |
| A79 | Badge/dot is Should; a11y name must reflect presence |
| A80 | Soft cap 50 items |
| A81 | Delivery channels beyond in-app menu are out |

## Account kinds — Company vs Individual

117. **Account kinds (Must):** Every tenant has exactly one **account kind**: **`company`** or **`individual`**, set at sign-up and **immutable** this slice **(A82, A89)**.
118. **Who may self-register (Must):** An unsigned-in person may create **either** a Company account **or** an Individual account. Drivers still **cannot** self-register; they are invited by Company Owner/Admin only **(10, A85)**.
119. **Company create (Must):** Choosing **Company** and completing sign-up with email, password (≥ 8), registration number, VAT, and address creates one **company** tenant (`account_kind = company`) with those legal/address fields and one **Owner** **(1, 49–51, A29)**. Missing legal fields → no tenant **(E33)**.
120. **Individual create (Must):** Choosing **Individual** and completing sign-up with **email** and **password** (≥ 8) only creates one **individual** tenant (`account_kind = individual`) and one **Owner** for that workspace. **Must not** require registration number, VAT, or company address **(A83, E73)**.
121. **Email uniqueness (Must):** Login email remains unique across **all** identities (Company Owner/Admin/Driver and Individual Owner) **(A6, E1, E74)**.
122. **Driver invite Company-only (Must):** Only **Owner** or **Admin** of a **`company`** tenant may create, edit, resend-invite, disable, or hard-delete **drivers**. Individual Owners, drivers, and unsigned-in users cannot **(3, 10, 25, 31, A85, E75)**.
123. **No Admins on Individual (Must):** Individual Owner **cannot** create Admins. Admin create remains **Company Owner only** **(23, A10, A84, E76)**.
124. **Individual feature subset (Must):** Individual Owner **may** on web and mobile: sign in; stay signed in per session rules; password reset; optional TOTP; create/edit **vehicles in their tenant** with compliance dates, warnings (19, 34), and optional mileage (64–71) on the **Details** surface only. **Must not** get vehicle **Images** (side appearance) or **Handovers** history; Drivers admin; Admins management; or driver next-travel / handover create / Daily usage driver shells **(A86, E77, E80)**.
125. **Company feature set unchanged (Must):** Company Owner/Admin retain existing driver + fleet + handover history + Global Header behaviors for **their company**.
126. **Tenant isolation (Must):** Principals only read/write drivers, vehicles, and related records in **their own** tenant. Cross-tenant access fails closed **(22, A8, A87, E78)**.
127. **Existing tenants (Must):** Tenants and principals that existed before this slice are **`account_kind = company`**. No re-registration required **(A88, US-84)**.
128. **Surfaces (Must):** Individual Owner uses the **management** experience limited by 124 (vehicles/settings/auth), **not** the invited-driver minimal home. Company drivers unchanged (4, 5).

| ID | Situation | Outcome |
| --- | --- | --- |
| E73 | Individual sign-up missing email/password or password &lt; 8 | No individual tenant/Owner created |
| E74 | Individual or Company sign-up email already a login identity | No new tenant/Owner **(E1 extended)** |
| E75 | Individual Owner (or driver/unsigned-in) attempts driver create/invite/admin | Rejected; no driver created/changed |
| E76 | Individual Owner attempts create Admin | Rejected; no Admin created |
| E77 | Individual Owner opens Company-only Drivers/Admins (or equivalent) | Denied; stay in Individual-allowed experience |
| E80 | Individual Owner uses vehicle side-image or handover-history APIs/UI | **403** / omit Images & Handovers tabs; vehicle details remain |
| E78 | Any principal accesses another tenant’s vehicles/drivers | Not found / forbidden; no leak |
| E79 | Request to change account kind after create | Rejected / not offered this slice **(A89)** |

| ID | Assumption |
| --- | --- |
| A82 | Two account kinds: **company** \| **individual** at sign-up |
| A83 | Individual profile = email + password only this slice |
| A84 | One Owner on Individual tenant; no Admin create |
| A85 | Drivers only on Company tenants |
| A86 | Individual subset = auth + own vehicle **details**/compliance-lite (no Images/Handovers tabs or APIs); not driver-ops shells |
| A87 | Isolation by tenant for both kinds |
| A88 | Legacy data = company kind |
| A89 | Kind immutable this slice |
| A90 | Self-registered principal role label **Owner**; capabilities from kind + role |

## Vehicle custom expirations (US-86–US-90)

129. **Custom expirations (Must):** A company or individual vehicle may store up to **10** optional **custom expiration** rows on the vehicle record: each has stable **`id`**, **`label`**, and **`expires_on`** (calendar date) **(A91)**.
130. **Who manages:** **Owner and Admin** of a **company** tenant and **Individual Owner** may create/edit/clear custom expirations on vehicle Details (web + management mobile). **Drivers** and unsigned-in users may not **(20, 21, A92)**.
131. **Label rules:** Label required; trim; length **1–80**; **unique per vehicle** case-insensitive after trim **(A93)**.
132. **Date rules:** Each row requires **`expires_on`** as `YYYY-MM-DD`. Empty/partial rows are not stored **(A93)**.
133. **Cap:** At most **10** rows per vehicle. Attempts above cap rejected **(A91)**.
134. **Optional section:** Vehicle save with **zero** custom rows is allowed (empty list) **(A91)**.
135. **Full replace on write:** When the client sends `custom_expirations`, the server **replaces** the whole list. Omitting the field on PATCH leaves existing rows unchanged. Sending `[]` clears all **(A94)**.
136. **Ids:** Server assigns UUID when create omits `id` (or null). Client may keep ids on edit so rows stay stable **(A94)**.
137. **Warnings (A1):** Each custom `expires_on` participates in the **same** 30-day / past expiry warning window as insurance, inspection, and road tax. Warning field key is **`custom:<id>`**. **`registration_on` still never warns** **(19, A1, A13, A95)**.
138. **Expired/soon save allowed:** Saving with custom dates expired or inside the window is allowed; warnings still show **(24, A11)**.
139. **List badges (Should):** Owner/Admin vehicle list **may** show chips for custom rows in warning/expired state using the **label** **(A96)**.
140. **Nav urgency (Should):** Vehicles nav/tab worst-wins **may** include each custom `expires_on` with the same red/orange bands as built-in section dates; still **not** registration **(34, A20, A22, A97)**.
141. **Notifications (Could):** Global Header menu **may** include custom rows (grain = vehicle + custom label) using the same 30-day window; not required to ship Details CRUD **(A98)**.
142. **Tenancy:** Custom expirations only for vehicles in the caller’s tenant **(22, A8)**.
143. **No cascade from drivers/images/handovers:** Custom expirations are vehicle master data only this slice **(A99)**.
144. **Confirm before remove (UI):** Removing a row in the client requires confirmation before the next vehicle save drops it from the full-replace payload **(61, A41)** — server does not offer a separate delete route.
145. **No separate resource routes:** No `/custom-expirations` sub-collection this slice **(A94)**.

| ID | Situation | Outcome |
| --- | --- | --- |
| E81 | custom_expirations not an array, >10, bad/duplicate id, empty/too-long/duplicate label, or bad/missing expires_on | **400** `validation_error`; vehicle not written with that payload |
| E82 | Driver / unsigned-in writes custom expirations | **403** / **401**; unchanged |
| E83 | Other-tenant vehicle | **404**; unchanged |

| ID | Assumption |
| --- | --- |
| A91 | Max 10 optional labeled date rows embedded on vehicle |
| A92 | Same vehicle write authz as other Details fields (incl. Individual) |
| A93 | Label 1–80 unique CI; date required YYYY-MM-DD per row |
| A94 | Embed + full-replace write; server-minted UUID |
| A95 | A1 warnings via `custom:<uuid>`; registration excluded |
| A96 | List chips Should |
| A97 | Nav urgency Should includes custom dates |
| A98 | Notification menu Could |
| A99 | No new image/handover/driver coupling |


## Pricing catalog (public web)

146. **Public pricing page (Must):** Unsigned-in users may view plan catalog on web `/pricing` with four plans (Personal, Plus, Team, Fleet) matching [pricing-plans.md](pricing-plans.md) **(A100)**.
147. **No checkout this slice:** Plan CTAs navigate to account-kind / sign-up only. No payment provider, invoices, or entitlement enforcement **(A101)**.
148. **Signed-in redirect:** Owner/Admin on `/pricing` → operational `/home`. Driver → driver home. Same pattern as public landing **(A102)**.
149. **Catalog source:** Prices and entitlements on the page must match [pricing-plans.md](pricing-plans.md); custom expirations only on Plus and Fleet (3 included/vehicle, +$0.70/mo per extra row) **(A103)**.
150. **No mobile marketing pricing:** No Expo marketing pricing screen this slice **(A104)**.

| ID | Situation | Outcome |
| --- | --- | --- |
| E84 | Signed-in Owner/Admin opens `/pricing` | Client redirect `/home`; no marketing stay |
| E85 | Signed-in driver opens `/pricing` | Client redirect driver home |
| E86 | User expects paywall on CTA | No charge; sign-up only this slice |

| ID | Assumption |
| --- | --- |
| A100 | Static catalog UI; no `/v1/plans` required |
| A101 | Billing/entitlements deferred |
| A102 | Pricing uses public chrome + session redirect like `/` |
| A103 | Copy locked to pricing-plans.md |
| A104 | Web-only public pricing |
