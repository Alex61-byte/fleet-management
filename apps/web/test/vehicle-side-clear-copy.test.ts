import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("vehicle side clear confirm copy (US-37 / US-40)", () => {
  const form = readFileSync(join(root, "components/vehicle-form.tsx"), "utf8");
  const dialog = readFileSync(join(root, "components/confirm-delete-dialog.tsx"), "utf8");

  it("uses shared ConfirmDeleteDialog and trash icon clear", () => {
    assert.match(form, /ConfirmDeleteDialog/);
    assert.match(form, /TrashIcon/);
    assert.match(form, /Clear \$\{VEHICLE_SIDE_LABEL\[clearConfirmSide\]\} photo\?/);
    assert.match(form, /Clear photo/);
    assert.match(form, /Clearing…/);
    assert.match(form, /This removes the photo from the vehicle/);
    assert.match(form, /aria-label=\{`Clear \$\{label\} photo`\}/);
    assert.doesNotMatch(form, /onClick=\{\(\) => void clearSide\(side\)\}/);
  });

  it("shared dialog is confirm-before-delete pattern", () => {
    assert.match(dialog, /US-40/);
    assert.match(dialog, /aria-modal/);
    assert.match(dialog, /Escape/);
  });
});
