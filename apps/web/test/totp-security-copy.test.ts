import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("web TOTP security setup", () => {
  it("renders QR from otpauth_url and manual secret, not raw otpauth text", () => {
    const src = readFileSync(join(root, "app/security/page.tsx"), "utf8");
    assert.match(src, /QRCode\.toDataURL/);
    assert.match(src, /Authenticator setup QR code/);
    assert.match(src, /Or enter this key manually/);
    assert.match(src, /setup\.secret/);
    assert.doesNotMatch(src, />\{setup\.otpauth_url\}</);
  });
});
