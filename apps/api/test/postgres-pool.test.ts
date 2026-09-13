import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { poolConfig } from "../src/db/postgres.ts";

describe("poolConfig (Render Postgres)", () => {
  it("enables SSL for Render external hosts", () => {
    const cfg = poolConfig(
      "postgresql://u:p@dpg-abc-a.oregon-postgres.render.com/fleet",
    );
    assert.deepEqual(cfg.ssl, { rejectUnauthorized: false });
  });

  it("enables SSL when sslmode=require", () => {
    const cfg = poolConfig("postgresql://u:p@localhost:5432/fleet?sslmode=require");
    assert.deepEqual(cfg.ssl, { rejectUnauthorized: false });
  });

  it("skips SSL for plain local URLs", () => {
    const cfg = poolConfig("postgresql://u:p@127.0.0.1:5432/fleet");
    assert.equal(cfg.ssl, undefined);
  });
});
