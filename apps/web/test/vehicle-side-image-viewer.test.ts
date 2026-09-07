import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("vehicle side image viewer (US-41–US-44 web)", () => {
  const form = readFileSync(join(root, "components/vehicle-form.tsx"), "utf8");
  const viewer = readFileSync(join(root, "components/vehicle-side-image-viewer.tsx"), "utf8");
  const theme = readFileSync(join(root, "../../design/tailwind.theme.ts"), "utf8");

  it("opens viewer from filled frame and keeps clear confirm separate", () => {
    assert.match(form, /VehicleSideImageViewer/);
    assert.match(form, /View \$\{label\} photo/);
    assert.match(form, /vehicleSideFrameFilled/);
    assert.match(form, /openClearConfirm/);
    assert.match(form, /ConfirmDeleteDialog/);
    assert.doesNotMatch(form, /Clear photo viewer/);
  });

  it("viewer supports zoom bounds and dismiss without storage writes", () => {
    assert.match(viewer, /VEHICLE_SIDE_ZOOM/);
    assert.match(viewer, /min: 1/);
    assert.match(viewer, /max: 3/);
    assert.match(viewer, /step: 0\.5/);
    assert.match(viewer, /Close photo viewer/);
    assert.match(viewer, /Zoom in/);
    assert.match(viewer, /Zoom out/);
    assert.match(viewer, /aria-modal/);
    assert.match(viewer, /Escape/);
    assert.match(viewer, /Photo could not be shown/);
    assert.doesNotMatch(viewer, /putVehicleSideImage|clearVehicleSideImage/);
  });

  it("slot token is larger ops preview (176px)", () => {
    assert.match(theme, /"vehicle-side-slot": "176px"/);
  });
});
