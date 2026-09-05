# TOTP challenge

**Stories:** US-04 (sign-in second step)  
**Density:** Web compact; mobile comfortable. Owner/Admin only.  
**Purpose:** Complete sign-in with authenticator code. Not shown to drivers.  
**Chrome:** Same [auth canvas](_patterns.md) as sign-in (inner form swap). Not a full app shell.

## Layout

```
authCanvas
  authCard
    authLockup Fleet + Fleet operations
    authTitle Authenticator code
    authCaption Enter the 6-digit code from your authenticator app.
    code field
    buttonPrimary Continue
    authLinks link Back to sign in
```

| Field | Class | Notes |
| --- | --- | --- |
| Code | `label` “Code” + `input` | One-time code keyboard; `font-tabular text-title tracking-wide tabular-nums`; 6 digits |
| Continue | `buttonPrimary` full width | Explicit control — do not auto-submit |
| Back | `link` in `authLinks` | Underline at rest, `min-h-hit`. Abandons incomplete sign-in |

## States

| State | UI |
| --- | --- |
| Default | Empty code |
| Loading | Continue busy “Verifying…”; field disabled |
| Missing/wrong code | `inputError` + `errorText` “That code is not valid.” Stay on this step (E3) |
| Success | Owner/Admin home |
| Offline | `bannerWarning`; Continue `buttonDisabled` |

## Token usage

| Role | Class |
| --- | --- |
| Canvas / card | `authCanvas` `authCard` |
| Lockup | `authLockup` `brandMarkAuth` `authWordmark` |
| Digits | `font-tabular text-title tabular-nums` |
| Back | `link` `linkHover` `linkFocus` `linkPressed` |
| Error | `inputError` `errorText` |

## A11y

| Control | Name |
| --- | --- |
| Screen | Authenticator code |
| Field | Code |
| Continue | Continue |
| Back | Back to sign in |

- Announce errors. Continue `min-h-hit`.
- Do not auto-submit (VoiceOver trap). Focus the code field when the step appears.
