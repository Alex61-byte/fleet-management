import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = join(import.meta.dirname, "..");

test("driver name prompt is non-dismissable on driver layout", () => {
  const dialog = readFileSync(join(root, "components/driver-name-dialog.tsx"), "utf8");
  assert.match(dialog, /driver_name_required/);
  assert.match(dialog, /setMyName/);
  assert.match(dialog, /Add your name/);
  assert.match(dialog, /Second Last Name/);
  assert.match(dialog, /onRequestClose=\{\(\) => undefined\}/);
  assert.match(dialog, /KeyboardAvoidingView/);
  assert.match(dialog, /keyboardShouldPersistTaps="handled"/);

  const layout = readFileSync(join(root, "app/(driver)/_layout.tsx"), "utf8");
  assert.match(layout, /DriverNameDialog/);
});
