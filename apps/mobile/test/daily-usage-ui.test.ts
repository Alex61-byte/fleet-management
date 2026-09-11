import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("daily usage UI (US-61–US-67 · US-113–US-115 mobile)", () => {
  const driver = readFileSync(join(root, "app/(driver)/index.tsx"), "utf8");
  const page = readFileSync(join(root, "app/(driver)/daily-usage.tsx"), "utf8");
  const signIn = readFileSync(join(root, "app/sign-in.tsx"), "utf8");

  it("driver hub links daily usage without auto-opening form on login", () => {
    assert.match(driver, /\/\(driver\)\/daily-usage/);
    assert.match(driver, /Daily usage/);
    assert.doesNotMatch(driver, /createDriverDailyUsage/);
    assert.doesNotMatch(signIn, /\/\(driver\)\/daily-usage/);
  });

  it("daily usage task screen has Day Start and End of Day panels", () => {
    assert.match(page, /createDriverDailyUsage/);
    assert.match(page, /endDriverDailyUsage/);
    assert.match(page, /listDriverDailyUsage/);
    assert.match(page, /Go to Next travel/);
    assert.match(page, /Save Day Start/);
    assert.match(page, /Save End of Day/);
    assert.match(page, /Day Start/);
    assert.match(page, /End of Day/);
    assert.match(page, /Your entries/);
    assert.match(page, /Refuel amount/);
    assert.match(page, /Refuel at mileage/);
    assert.match(page, /ScrollView/);
    assert.match(page, /KeyboardAvoidingView/);
    assert.match(page, /odometerUnitLabel/);
    assert.doesNotMatch(page, /deleteDailyUsage|editDailyUsage/i);
  });

  it("floors start distance from closed ends only (A61)", () => {
    assert.match(page, /minStartDistance/);
    assert.match(page, /status === \"closed\"/);
    assert.match(page, /last\.end_distance/);
    assert.match(page, /Must be at least \$\{minStartDistance\} \$\{unit\}/);
    assert.match(page, /last recorded end distance/);
  });
});
