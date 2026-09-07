import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("web vehicle side prepare before upload", () => {
  const form = readFileSync(join(root, "components/vehicle-form.tsx"), "utf8");
  const prepare = readFileSync(join(root, "lib/prepare-side-image.ts"), "utf8");

  it("prepares image before putVehicleSideImage and blocks still-too-large", () => {
    assert.match(form, /prepareVehicleSideImageForUpload/);
    assert.match(form, /if \(!prepared\.ok\)/);
    assert.match(form, /putVehicleSideImage\(\s*vehicle\.id,\s*side,\s*prepared\.file/);
  });

  it("uses SDK ladder and canvas JPEG when over limit", () => {
    assert.match(prepare, /sideImagePreparePlan/);
    assert.match(prepare, /runSideImageCompressLadder/);
    assert.match(prepare, /image\/jpeg/);
    assert.match(prepare, /SIDE_IMAGE_STILL_TOO_LARGE_MESSAGE/);
  });
});
