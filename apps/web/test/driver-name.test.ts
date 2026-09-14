import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = join(import.meta.dirname, "..");

test("driver name prompt is non-dismissable on driver shell", () => {
  const dialog = readFileSync(join(root, "components/driver-name-dialog.tsx"), "utf8");
  assert.match(dialog, /driver_name_required/);
  assert.match(dialog, /setMyName/);
  assert.match(dialog, /Add your name/);
  assert.match(dialog, /Second Last Name/);
  assert.doesNotMatch(dialog, /onCancel|Escape|backdrop/i);

  const shell = readFileSync(join(root, "components/driver-shell.tsx"), "utf8");
  assert.match(shell, /DriverNameDialog/);
});
