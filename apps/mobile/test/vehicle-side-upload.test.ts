import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("mobile vehicle side upload (US-35/36)", () => {
  const form = readFileSync(join(root, "components/vehicle-form.tsx"), "utf8");
  const appJson = readFileSync(join(root, "app.json"), "utf8");

  it("prepares then uploads with prepared file and filename", () => {
    assert.match(form, /prepareVehicleSideImageForUpload/);
    assert.match(form, /putVehicleSideImage\(\s*vehicle\.id,\s*side,\s*prepared\.file/);
    assert.match(form, /uri: asset\.uri/);
  });

  it("configures expo-image-picker plugin for photo library permission", () => {
    assert.match(appJson, /expo-image-picker/);
    assert.match(appJson, /photosPermission/);
  });
});
