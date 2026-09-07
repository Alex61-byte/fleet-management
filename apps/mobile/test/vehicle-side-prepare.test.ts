import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("mobile vehicle side prepare before upload", () => {
  const form = readFileSync(join(root, "components/vehicle-form.tsx"), "utf8");
  const prepare = readFileSync(join(root, "lib/prepare-side-image.ts"), "utf8");
  const pkg = readFileSync(join(root, "package.json"), "utf8");

  it("prepares image before putVehicleSideImage and blocks still-too-large", () => {
    assert.match(form, /prepareVehicleSideImageForUpload/);
    assert.match(form, /if \(!prepared\.ok\)/);
    assert.match(form, /putVehicleSideImage\(\s*vehicle\.id,\s*side,\s*prepared\.file/);
  });

  it("uses image-manipulator + SDK ladder when over limit", () => {
    assert.match(pkg, /expo-image-manipulator/);
    assert.match(prepare, /ImageManipulator/);
    assert.match(prepare, /runSideImageCompressLadder/);
    assert.match(prepare, /SIDE_IMAGE_STILL_TOO_LARGE_MESSAGE/);
  });

  it("returns expo-file-system File with bytes() for Expo winter fetch", () => {
    assert.match(prepare, /expo-file-system/);
    assert.match(prepare, /BytesImageFile/);
    assert.match(prepare, /Unsupported FormDataPart/);
    assert.match(pkg, /expo-file-system/);
    assert.doesNotMatch(prepare, /ok: true, file: passthroughBlob/);
    assert.doesNotMatch(prepare, /\{ uri: asset\.uri/);
  });
});
