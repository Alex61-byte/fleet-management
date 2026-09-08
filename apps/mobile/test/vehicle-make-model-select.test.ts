import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("vehicle make/model catalog select (mobile)", () => {
  const form = readFileSync(join(root, "components/vehicle-form.tsx"), "utf8");
  const ui = readFileSync(join(root, "components/ui.tsx"), "utf8");

  it("uses shared catalog selects with Other free-text fallback", () => {
    assert.match(ui, /export function SelectInput/);
    assert.match(form, /vehicleCatalogMakes/);
    assert.match(form, /vehicleCatalogModelsForMake/);
    assert.match(form, /VEHICLE_CATALOG_OTHER/);
    assert.match(form, /Select make/);
    assert.match(form, /Select model/);
    assert.match(form, /Make \(custom\)/);
    assert.match(form, /Model \(custom\)/);
  });
});
