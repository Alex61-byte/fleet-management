import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pgDateToIso, poolConfig } from "../src/db/postgres.ts";

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

describe("pgDateToIso", () => {
  it("maps JS Date from node-pg to YYYY-MM-DD (not locale String slice)", () => {
    const d = new Date(Date.UTC(2026, 8, 10));
    assert.equal(pgDateToIso(d), "2026-09-10");
    // Regression: String(Date).slice(0, 10) is not ISO (e.g. "Thu Sep 1")
    assert.notEqual(String(d).slice(0, 10), "2026-09-10");
  });

  it("keeps ISO strings and nulls", () => {
    assert.equal(pgDateToIso("2026-09-10"), "2026-09-10");
    assert.equal(pgDateToIso("2026-09-10T00:00:00.000Z"), "2026-09-10");
    assert.equal(pgDateToIso(null), null);
    assert.equal(pgDateToIso(undefined), null);
    assert.equal(pgDateToIso(""), null);
  });
});
