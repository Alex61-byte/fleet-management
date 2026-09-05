import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("mobile TOTP security setup", () => {
  it("offers open authenticator + copy key (no same-phone QR scan)", () => {
    const src = readFileSync(join(root, "app/(owner)/more/security.tsx"), "utf8");
    assert.match(src, /Open authenticator app/);
    assert.match(src, /Copy setup key/);
    assert.match(src, /Linking\.openURL/);
    assert.match(src, /Clipboard\.setStringAsync/);
    assert.match(src, /setup\.secret/);
  });
});
