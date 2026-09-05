# Fleet management

npm workspaces monorepo.

| Package | Role |
| --- | --- |
| [apps/api](apps/api) | Fastify `/v1` API |
| [apps/web](apps/web) | Next.js Owner/Admin |
| [apps/mobile](apps/mobile) | Expo one binary, Owner/Admin + driver shells |
| [packages/sdk](packages/sdk) | Typed `/v1` client |

## Run

```bash
npm install
npm test
npm run dev
```

`npm run dev` starts API (3001) and web (3000) via Turborepo. Expo needs its own terminal so the QR and `i`/`a`/`w` menu print (`expo start` on a real TTY, not Turbo TUI):

```bash
npm run dev:mobile
```

Individual processes: `npm run dev:api`, `dev:web`, `dev:mobile`.

API defaults to port 3001 (in-memory store). Web defaults to 3000 and `NEXT_PUBLIC_API_URL=http://localhost:3001`.

**Mobile API URL:** copy [apps/mobile/.env.example](apps/mobile/.env.example) → `apps/mobile/.env` and set:

```bash
EXPO_PUBLIC_API_URL=http://<your-lan-ip>:3001
```

Expo loads that file automatically (`npm run dev:mobile`). Restart Expo after changes. If unset, the app derives the host from Metro’s LAN address (Android emulator falls back to `10.0.2.2:3001`).

### PostgreSQL (Render)

1. In [Render](https://render.com), create a **PostgreSQL** instance.
2. Open **Connect** and copy the URL:
   - **External Database URL** — API on your laptop / any host outside Render’s private network.
   - **Internal Database URL** — API service on Render in the same region (lower latency, no egress).
3. Copy [`.env.example`](.env.example) to `.env` (repo root or `apps/api/`) and set:

```bash
DATABASE_URL=postgresql://…   # paste from Render
JWT_SECRET=…                  # long random string in production
```

4. Restart the API (`npm run dev` / `npm run dev:api`). Schema applies automatically from [`apps/api/src/db/schema.sql`](apps/api/src/db/schema.sql) on connect.

SSL is enabled for Render hosts and for URLs with `sslmode=require` (or `DATABASE_SSL=true`). Without `DATABASE_URL`, the API keeps the in-memory store (tests/local only).

### Driver invites (Resend)

Optional for local dev (create still succeeds with `invite_email_sent: false` if unset):

```bash
RESEND_API_KEY=re_…
RESEND_FROM=Fleet <onboarding@resend.dev>   # or an address on a verified domain
PUBLIC_WEB_URL=http://localhost:3000
# optional mobile deep link base, e.g. fleet://invite
PUBLIC_MOBILE_INVITE_SCHEME=fleet
```

Both `RESEND_API_KEY` and `RESEND_FROM` are required. If either is missing, create driver still succeeds but `invite_email_sent` is `false`.

**Resend test sender:** `onboarding@resend.dev` only delivers to the email on your Resend account. For real driver addresses, verify a domain in Resend and set `RESEND_FROM` to that domain.

Invite links open `{PUBLIC_WEB_URL}/invite?token=…`. Drivers set their own password; no temporary passwords.

Contracts: [docs/contracts/http-v1.md](docs/contracts/http-v1.md).
