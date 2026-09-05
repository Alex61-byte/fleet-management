# ADR-006 — Turborepo for task orchestration (npm workspaces)

**Status:** Accepted  
**Slice:** repo infra (not a product feature)

## Decision

Keep **npm workspaces**. Add **Turborepo** as the only task orchestrator for `dev`, `test`, `typecheck`, and `build`. Remove `concurrently`.

- Cached pipelines: `build`, `test`, `typecheck`.
- Persistent uncached: `dev` (api, web) and `start` (Expo).
- Package graph: `@fleet/sdk` before `@fleet/web` and `@fleet/mobile`; `@fleet/api` independent of Next/Expo.
- **Expo QR** is printed only by `npm run dev:mobile` in its **own terminal** (real TTY). Default `npm run dev` is api + web only.

## Task graph

| Turbo task | `dependsOn` | cache | persistent | Who has the script |
| --- | --- | --- | --- | --- |
| `build` | `["^build"]` | yes | no | api (`dist/**`), web (`.next/**`, exclude `.next/cache/**` and `.next/dev/**`). sdk/mobile: no `build` today → skipped |
| `typecheck` | `["^typecheck"]` | yes | no | all four; sdk before web/mobile; api parallel |
| `test` | `["^test"]` | yes | no | all four; same graph as typecheck |
| `dev` | none | **false** | **true** | api, web only in the **root** command |
| `start` | none | **false** | **true** | mobile (`expo start`) |

`^` follows **package.json workspace deps**: web/mobile depend on `@fleet/sdk`; api does not depend on Next/Expo/sdk.

### `turbo.json` contract

```jsonc
{
  "$schema": "https://turborepo.dev/schema.json",
  "ui": "stream",
  "envMode": "loose",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**", "!.next/dev/**"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "test": {
      "dependsOn": ["^test"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "start": {
      "cache": false,
      "persistent": true
    }
  }
}
```

`envMode: "loose"` so `DATABASE_URL`, `JWT_SECRET`, `EXPO_PUBLIC_*` are not stripped.

### Root scripts

| Script | Meaning |
| --- | --- |
| `dev` | `turbo run dev --filter=@fleet/api --filter=@fleet/web` |
| `dev:api` | `turbo run dev --filter=@fleet/api` |
| `dev:web` | `turbo run dev --filter=@fleet/web` |
| `dev:mobile` | `turbo run start --filter=@fleet/mobile` — **QR lives here** |
| `test` | `turbo npm run start -w @fleet/mobile` — **QR lives here** (Expo owns the TTY; do not wrap with `turbo run` + `interactive`)
| `typecheck` | `turbo run typecheck` |
| `build` | `turbo run build` |

Keep `@fleet/mobile` `start` as `expo start`. Do **not** add mobile to the default `dev` filter. If `"dev": "expo start"` is added on mobile for symmetry, the root `dev` filter remains mandatory.

Do **not** set `start.interactive: true` while `ui` is `stream`: Turbo 2.x refuses interactive tasks without Terminal UI (`ui: tui`). TUI would steal stdin and hide the QR, so `dev:mobile` calls the workspace script directly.

Pin `packageManager` in root `package.json`. Gitignore `.turbo/`.

## Expo QR

```bash
# terminal 1
npm run dev

# terminal 2 — this prints the QR
npm run dev:mobile
```

Physical devices: `EXPO_PUBLIC_API_URL` must be the LAN IP, not localhost.

## Alternatives

1. One turbo `dev` for api + web + mobile (TUI / stream / `--output-logs=new-only`) — rejected: Expo Terminal UI needs an exclusive TTY; multiplexers eat the QR.
2. Keep `concurrently` (including `--raw`) — rejected: not a TTY; two orchestrators.
3. Switch to pnpm/yarn — rejected: no lockfile/workspace reason.
4. `CI=1`, `EXPO_NO_INTERACTIVE`, piping, `EXPO_NO_QR_CODE` — rejected: disable or hide QR.

## Consequences

- Root scripts call `turbo run …` with filters as specified.
- Developers who need the QR run a second terminal: `npm run dev:mobile`.
- CI runs `turbo run typecheck test build`.
- Product ADRs 001–005 and HTTP `/v1` are unchanged.

## Revisit when

Turbo can attach a raw TTY to one persistent child such that Expo’s QR and `i`/`a`/`w` work; or BA adds a mobile production `build`/`export` pipeline.
