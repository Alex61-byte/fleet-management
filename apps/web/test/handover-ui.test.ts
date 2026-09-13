import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("vehicle handovers UI (US-51–US-60 web)", () => {
  const driver = readFileSync(join(root, "app/driver/page.tsx"), "utf8");
  const travel = readFileSync(join(root, "app/driver/travel/page.tsx"), "utf8");
  const handoverPage = readFileSync(join(root, "app/driver/handover/page.tsx"), "utf8");
  const panel = readFileSync(join(root, "components/driver-handover-panel.tsx"), "utf8");
  const form = readFileSync(join(root, "components/vehicle-form.tsx"), "utf8");
  const history = readFileSync(join(root, "components/vehicle-handovers-tab.tsx"), "utf8");
  const viewer = readFileSync(join(root, "components/vehicle-side-image-viewer.tsx"), "utf8");
  const theme = readFileSync(join(root, "../../design/tailwind.theme.ts"), "utf8");
  const signIn = readFileSync(join(root, "app/sign-in/page.tsx"), "utf8");

  it("driver start hub does not mount handover form; login lands on start", () => {
    assert.match(driver, /DriverHubLink/);
    assert.match(driver, /href=\"\/driver\/travel\"/);
    assert.match(driver, /href=\"\/driver\/handover\"/);
    assert.match(driver, /Choose what you need/);
    assert.doesNotMatch(driver, /DriverHandoverPanel/);
    assert.doesNotMatch(driver, /putDriverTravel/);
    assert.match(signIn, /router\.replace\(\"\/driver\"\)/);
    assert.doesNotMatch(signIn, /\/driver\/handover/);
  });

  it("handover and travel are dedicated routes with back to home", () => {
    assert.match(travel, /putDriverTravel/);
    assert.match(travel, /Continue to handover/);
    assert.match(travel, /router\.replace\("\/driver\/handover"\)/);
    assert.match(travel, /Back to Home|DriverBackLink/);
    assert.match(handoverPage, /DriverHandoverPanel/);
    assert.match(handoverPage, /onHandoverSaved/);
    assert.match(handoverPage, /router\.replace\("\/driver"\)/);
    assert.match(handoverPage, /Go to Next travel/);
    assert.match(panel, /getDriverActiveHandover/);
    assert.match(panel, /listDriverDailyUsage/);
    assert.match(panel, /lastClosedEndDistance|end_distance/);
    assert.match(panel, /Must be at least/);
    assert.match(panel, /createDriverHandover/);
    assert.match(panel, /Submit Handover Out/);
    assert.match(panel, /Submit Handover In/);
    assert.match(panel, /handoverDamageGrid/);
    assert.match(panel, /odometerUnitLabel/);
    assert.doesNotMatch(panel, /unit picker|UnitPicker/i);
  });

  it("owner vehicle form exposes read-only Handovers tab when vehicle exists", () => {
    assert.match(form, /VehicleHandoversTab/);
    assert.match(form, /Handovers/);
    assert.match(form, /tab === "handovers"/);
    assert.match(form, /companyTenant && tab === "handovers" && vehicle\?\.id/);
    assert.match(history, /listVehicleHandovers/);
    assert.match(history, /getVehicleHandover/);
    assert.match(history, /No handovers yet/);
    assert.match(history, /Close handover detail/);
    assert.doesNotMatch(history, /deleteHandover|editHandover|onDelete/);
  });

  it("US-119 owner list and Details show open Out custody cue", () => {
    const list = readFileSync(join(root, "app/vehicles/page.tsx"), "utf8");
    const ui = readFileSync(join(root, "components/ui.tsx"), "utf8");
    assert.match(ui, /OpenOutCustodyCue/);
    assert.match(ui, /Out open/);
    assert.match(list, /OpenOutCustodyCue/);
    assert.match(list, /open_out/);
    assert.match(form, /OpenOutCustodyCue/);
    assert.match(form, /vehicle\.open_out/);
    assert.match(form, /Vehicle custody/);
  });

  it("US-120 list filter custody and sort by expiration", () => {
    const list = readFileSync(join(root, "app/vehicles/page.tsx"), "utf8");
    const ui = readFileSync(join(root, "components/ui.tsx"), "utf8");
    const themeTokens = readFileSync(join(root, "../../design/tailwind.theme.ts"), "utf8");
    assert.match(list, /projectVehiclesList/);
    assert.match(list, /collectVehicleListCustomSortFields/);
    assert.match(list, /VEHICLE_LIST_SORT_BUILTIN_FIELDS/);
    assert.match(list, /SelectInput/);
    assert.match(ui, /selectControl|selectNative/);
    assert.match(ui, /role=\"listbox\"|createPortal/);
    assert.match(themeTokens, /selectMenu:/);
    assert.match(list, /label="Custody"/);
    assert.match(list, /label="Sort by"/);
    assert.match(list, /label="Order"/);
    assert.match(list, /Any expiration/);
    assert.match(list, /Soonest first/);
    assert.match(list, /Furthest first/);
    assert.doesNotMatch(list, /SegmentedControl/);
    assert.match(list, /No vehicles match/);
    assert.match(list, /account_kind === "company"/);
  });

  it("damage viewer reuses side viewer with optional title", () => {
    assert.match(viewer, /title\?: string/);
    assert.match(panel, /Damage photo \$\{/);
    assert.match(history, /Damage photo \$\{/);
    assert.match(theme, /handoverDamageGrid/);
    assert.match(theme, /handoverDamageThumb/);
  });
});
