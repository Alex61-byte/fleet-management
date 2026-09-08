import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  VEHICLE_CATALOG_OTHER,
  VEHICLE_MAKES_MODELS_CATALOG,
  vehicleCatalogMakes,
  vehicleCatalogModelsForMake,
  vehicleMakeSelectValue,
  vehicleModelSelectValue,
} from "../src/index.ts";

describe("vehicle makes/models catalog", () => {
  it("exposes sorted unique makes with non-empty model lists", () => {
    const makes = vehicleCatalogMakes();
    assert.ok(makes.length >= 20);
    assert.deepEqual([...makes].sort((a, b) => a.localeCompare(b)), makes);
    assert.equal(new Set(makes).size, makes.length);
    for (const make of makes) {
      const models = vehicleCatalogModelsForMake(make);
      assert.ok(models.length > 0, make);
      assert.deepEqual(
        [...models].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
        models,
      );
    }
    assert.equal(VEHICLE_MAKES_MODELS_CATALOG.version, 1);
  });

  it("resolves known and custom make/model select values", () => {
    assert.equal(vehicleMakeSelectValue("Ford"), "Ford");
    assert.equal(vehicleMakeSelectValue(" ford "), "Ford");
    assert.equal(vehicleMakeSelectValue("Acme Motors"), VEHICLE_CATALOG_OTHER);
    assert.equal(vehicleMakeSelectValue(""), "");

    assert.equal(vehicleModelSelectValue("Ford", "Transit"), "Transit");
    assert.equal(vehicleModelSelectValue("Ford", "Custom Van"), VEHICLE_CATALOG_OTHER);
    assert.equal(vehicleModelSelectValue("Acme Motors", "X1"), VEHICLE_CATALOG_OTHER);
    assert.equal(vehicleCatalogModelsForMake(VEHICLE_CATALOG_OTHER).length, 0);
  });
});
