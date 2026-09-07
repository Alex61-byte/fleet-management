import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("vehicle handovers UI (US-51–US-60 mobile)", () => {
  const driver = readFileSync(join(root, "app/(driver)/index.tsx"), "utf8");
  const travel = readFileSync(join(root, "app/(driver)/travel.tsx"), "utf8");
  const handoverPage = readFileSync(join(root, "app/(driver)/handover.tsx"), "utf8");
  const panel = readFileSync(join(root, "components/driver-handover-panel.tsx"), "utf8");
  const form = readFileSync(join(root, "components/vehicle-form.tsx"), "utf8");
  const history = readFileSync(join(root, "components/vehicle-handovers-tab.tsx"), "utf8");
  const viewer = readFileSync(join(root, "components/vehicle-side-image-viewer.tsx"), "utf8");
  const signIn = readFileSync(join(root, "app/sign-in.tsx"), "utf8");

  it("driver start hub does not mount handover form; login lands on start", () => {
    assert.match(driver, /\/\(driver\)\/travel/);
    assert.match(driver, /\/\(driver\)\/handover/);
    assert.match(driver, /Choose what you need/);
    assert.doesNotMatch(driver, /DriverHandoverPanel/);
    assert.doesNotMatch(driver, /putDriverTravel/);
    assert.match(signIn, /\/\(driver\)/);
    assert.doesNotMatch(signIn, /\/\(driver\)\/handover/);
  });

  it("handover and travel are dedicated screens with back to home", () => {
    assert.match(travel, /putDriverTravel/);
    assert.match(travel, /Back to Home/);
    assert.match(handoverPage, /DriverHandoverPanel/);
    assert.match(handoverPage, /onHandoverSaved/);
    assert.match(handoverPage, /Go to Next travel/);
    assert.match(panel, /getDriverActiveHandover/);
    assert.match(panel, /createDriverHandover/);
    assert.match(panel, /Submit Handover Out/);
    assert.match(panel, /Submit Handover In/);
    assert.match(panel, /odometerUnitLabel/);
    assert.match(panel, /prepareVehicleSideImageForUpload/);
    assert.doesNotMatch(panel, /unit picker|UnitPicker/i);
  });

  it("owner vehicle form exposes read-only Handovers tab when vehicle exists", () => {
    assert.match(form, /VehicleHandoversTab/);
    assert.match(form, /Handovers/);
    assert.match(form, /tab !== "handovers"/);
    assert.match(history, /listVehicleHandovers/);
    assert.match(history, /getVehicleHandover/);
    assert.match(history, /No handovers yet/);
    assert.match(history, /Close handover detail/);
    assert.doesNotMatch(history, /deleteHandover|editHandover|onDelete/);
  });

  it("damage viewer supports optional title override", () => {
    assert.match(viewer, /title\?: string/);
    assert.match(panel, /Damage photo \$\{/);
    assert.match(history, /Damage photo \$\{/);
  });
});
