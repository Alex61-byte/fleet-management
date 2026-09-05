import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { FleetApiError, FleetClient, type TokenStore } from "../src/index.ts";

function memoryTokens(initial?: { access?: string | null; refresh?: string | null }): TokenStore {
  let access = initial?.access ?? null;
  let refresh = initial?.refresh ?? null;
  return {
    getAccess: () => access,
    getRefresh: () => refresh,
    setTokens(a, r) {
      access = a;
      refresh = r;
    },
    clear() {
      access = null;
      refresh = null;
    },
  };
}

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("US-29 tryRefresh updates tokens on success", async () => {
  const tokens = memoryTokens({ access: "old-a", refresh: "old-r" });
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ access_token: "new-a", refresh_token: "new-r" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  const client = new FleetClient("http://api.test", tokens);
  assert.equal(await client.tryRefresh(), true);
  assert.equal(tokens.getAccess(), "new-a");
  assert.equal(tokens.getRefresh(), "new-r");
});

test("US-29 tryRefresh clears tokens on failure", async () => {
  const tokens = memoryTokens({ access: "old-a", refresh: "old-r" });
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: { code: "unauthenticated", message: "x" } }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  const client = new FleetClient("http://api.test", tokens);
  assert.equal(await client.tryRefresh(), false);
  assert.equal(tokens.getAccess(), null);
  assert.equal(tokens.getRefresh(), null);
});

test("US-29 authenticated 401 triggers single refresh then retry", async () => {
  const tokens = memoryTokens({ access: "expired", refresh: "live-r" });
  let calls = 0;
  globalThis.fetch = async (input, init) => {
    calls += 1;
    const url = String(input);
    if (url.endsWith("/v1/auth/refresh")) {
      return new Response(JSON.stringify({ access_token: "new-a", refresh_token: "new-r" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.endsWith("/v1/me")) {
      const auth = (init as RequestInit | undefined)?.headers as Record<string, string> | undefined;
      const bearer = auth?.authorization ?? "";
      if (bearer.includes("expired")) {
        return new Response(JSON.stringify({ error: { code: "unauthenticated", message: "x" } }), {
          status: 401,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          id: "1",
          email: "a@b.c",
          role: "owner",
          company_id: "c",
          must_change_password: false,
          login_enabled: true,
          totp_enabled: false,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    throw new Error(`unexpected ${url}`);
  };
  const client = new FleetClient("http://api.test", tokens);
  const me = await client.me();
  assert.equal(me.email, "a@b.c");
  assert.equal(tokens.getAccess(), "new-a");
  assert.equal(tokens.getRefresh(), "new-r");
  assert.equal(calls, 3); // me 401, refresh, me retry
});

test("US-29 refresh failure on 401 path surfaces FleetApiError and clears", async () => {
  const tokens = memoryTokens({ access: "expired", refresh: "dead-r" });
  let invalidCalls = 0;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/v1/auth/refresh")) {
      return new Response(JSON.stringify({ error: { code: "unauthenticated", message: "x" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: { code: "unauthenticated", message: "x" } }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  };
  const client = new FleetClient("http://api.test", tokens);
  client.setOnSessionInvalid(() => {
    invalidCalls += 1;
  });
  await assert.rejects(() => client.me(), (err: unknown) => {
    assert.ok(err instanceof FleetApiError);
    assert.equal(err.status, 401);
    return true;
  });
  assert.equal(tokens.getAccess(), null);
  assert.equal(tokens.getRefresh(), null);
  assert.equal(invalidCalls, 1);
});
