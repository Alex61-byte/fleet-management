import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { mapAuthError } from "@fleet/sdk";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("web copy matches design for credential errors", () => {
  assert.equal(mapAuthError("invalid_credentials", ""), "Sign-in details are not correct.");
  assert.equal(mapAuthError("validation_error", ""), "Check the email format and try again.");
  assert.equal(mapAuthError("login_disabled", ""), "Sign-in is disabled for this driver.");
});

test("US-29 session-ended banner copy on sign-in", () => {
  const session = readFileSync(join(root, "lib/session.ts"), "utf8");
  const signIn = readFileSync(join(root, "app/sign-in/page.tsx"), "utf8");
  const auth = readFileSync(join(root, "lib/auth-context.tsx"), "utf8");
  const shell = readFileSync(join(root, "components/app-shell.tsx"), "utf8");
  assert.match(session, /Your session ended\. Sign in again to continue\./);
  assert.match(signIn, /takeSessionEndedMessage/);
  assert.match(signIn, /tone="warning"/);
  assert.match(auth, /setOnSessionInvalid/);
  assert.match(shell, /router\.replace\("\/sign-in"\)/);
});
