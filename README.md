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

API defaults to port 3001 (in-memory store). Web defaults to 3000 and `NEXT_PUBLIC_API_URL=http://localhost:3001`. Mobile uses `EXPO_PUBLIC_API_URL` (same default). Physical devices need your LAN IP instead of localhost.

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

Contracts: [docs/contracts/http-v1.md](docs/contracts/http-v1.md).
