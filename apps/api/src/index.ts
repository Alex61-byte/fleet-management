import { buildApp } from "./app.ts";
import { PostgresStore } from "./db/postgres.ts";
import { MemoryStore, type Store } from "./store.ts";

/** Empty JWT_SECRET= in .env must not become a zero-length signing key. */
function jwtSecretBytes(): Uint8Array {
  const raw = process.env.JWT_SECRET?.trim();
  if (raw) return new TextEncoder().encode(raw);
  if (process.env.NODE_ENV === "production") {
    throw new Error("@fleet/api JWT_SECRET is required in production");
  }
  console.warn("@fleet/api JWT_SECRET missing/empty; using insecure dev default");
  return new TextEncoder().encode("dev-only-change-me");
}

const secret = jwtSecretBytes();

let store: Store = new MemoryStore();
const databaseUrl = process.env.DATABASE_URL?.trim();
if (databaseUrl) {
  console.log("@fleet/api using PostgreSQL (DATABASE_URL)");
  store = await PostgresStore.connect(databaseUrl);
} else {
  console.log("@fleet/api using in-memory store (set DATABASE_URL for Render/local Postgres)");
}

const app = await buildApp({ store, jwtSecret: secret });
const port = Number(process.env.PORT ?? 3001);

await app.listen({ port, host: "0.0.0.0" });
console.log(`@fleet/api listening on ${port}`);
