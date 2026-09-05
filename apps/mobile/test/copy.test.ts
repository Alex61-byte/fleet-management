import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { mapAuthError } from "@fleet/sdk";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("mobile copy matches design", () => {
  assert.equal(mapAuthError("invalid_credentials", ""), "Sign-in details are not correct.");
  assert.equal(mapAuthError("validation_error", ""), "Check the email format and try again.");
  assert.equal(mapAuthError("invite_invalid", ""), "This invitation is not valid.");
  assert.equal(mapAuthError("email_not_invited", ""), "This email does not match the invitation.");
});

test("US-29 session-ended banner copy on sign-in", () => {
  const tokens = readFileSync(join(root, "lib/tokens.ts"), "utf8");
  const signIn = readFileSync(join(root, "app/sign-in.tsx"), "utf8");
  assert.match(tokens, /Your session ended\. Sign in again to continue\./);
  assert.match(signIn, /takeSessionEndedMessage/);
  assert.match(signIn, /tone="warning"/);
});

test("hydrateTokens must not clobber in-memory session set during async read", () => {
  const tokens = readFileSync(join(root, "lib/tokens.ts"), "utf8");
  assert.match(tokens, /if \(accessMem \|\| refreshMem\) return/);
});

test("password TextInputs default to autoCapitalize none", () => {
  const ui = readFileSync(join(root, "components/ui.tsx"), "utf8");
  const signIn = readFileSync(join(root, "app/sign-in.tsx"), "utf8");
  assert.match(ui, /secure \? "none"/);
  assert.match(signIn, /autoCapitalize="none"/);
  assert.match(signIn, /secureTextEntry/);
});

test("invite accept screen uses preview and accept", () => {
  const invite = readFileSync(join(root, "app/invite.tsx"), "utf8");
  assert.match(invite, /previewInvite/);
  assert.match(invite, /acceptInvite/);
  assert.doesNotMatch(invite, /changeFirstPassword/);
});

test("new driver is email-only invite", () => {
  const neu = readFileSync(join(root, "app/(owner)/drivers/new.tsx"), "utf8");
  assert.match(neu, /createDriver\(email/);
  assert.doesNotMatch(neu, /Temporary password/);
  assert.match(neu, /Send invitation/);
});
