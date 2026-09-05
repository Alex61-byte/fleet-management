import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const editSrc = readFileSync(join(root, "app/drivers/[id]/page.tsx"), "utf8");

describe("web US-27 hard delete driver copy", () => {
  it("keeps remove block separate from disable sheet", () => {
    assert.match(editSrc, /Remove driver/);
    assert.match(editSrc, /Permanently remove this driver from your company\. This cannot be undone\./);
    assert.match(editSrc, /Delete driver/);
    assert.match(editSrc, /Delete driver\?/);
    assert.match(
      editSrc,
      /will be removed from your company\. They cannot sign in\. This cannot be\s+undone\./,
    );
    assert.match(editSrc, /To add them later, create a new driver\./);
    assert.match(editSrc, /Delete permanently/);
    assert.match(editSrc, /Deleting…/);
    assert.match(editSrc, /Driver could not be deleted\./);
    assert.match(editSrc, /deleteDriver/);
    assert.match(editSrc, /router\.replace\("\/drivers"\)/);
  });

  it("keeps US-16 disable flow distinct", () => {
    assert.match(editSrc, /Disable sign-in\?/);
    assert.match(editSrc, /The driver profile is kept\./);
    assert.match(editSrc, /Disable sign-in/);
    assert.match(editSrc, /setLogin\(false\)/);
    assert.match(editSrc, /login_enabled:\s*enabled/);
    assert.match(editSrc, /confirmDisable/);
    assert.match(editSrc, /confirmDelete/);
  });
});
