import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("vehicle side image viewer (US-41–US-44 mobile)", () => {
  const form = readFileSync(join(root, "components/vehicle-form.tsx"), "utf8");
  const viewer = readFileSync(join(root, "components/vehicle-side-image-viewer.tsx"), "utf8");

  it("opens full-screen viewer from filled frame; clear stays sheet", () => {
    assert.match(form, /VehicleSideImageViewer/);
    assert.match(form, /View \$\{label\} photo/);
    assert.match(form, /h-vehicle-side-slot/);
    assert.match(form, /setViewerSide\(null\)/);
    assert.match(form, /ConfirmDeleteDialog/);
  });

  it("viewer is full-screen with zoom controls and no storage writes", () => {
    assert.match(viewer, /presentationStyle="fullScreen"/);
    assert.match(viewer, /VEHICLE_SIDE_ZOOM/);
    assert.match(viewer, /Close photo viewer/);
    assert.match(viewer, /Zoom in/);
    assert.match(viewer, /Zoom out/);
    assert.match(viewer, /Photo could not be shown/);
    assert.doesNotMatch(viewer, /putVehicleSideImage|clearVehicleSideImage/);
    assert.doesNotMatch(viewer, /justify-end/);
  });
});
