import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("daily usage UI (US-61–US-67 web)", () => {
  const driver = readFileSync(join(root, "app/driver/page.tsx"), "utf8");
  const page = readFileSync(join(root, "app/driver/daily-usage/page.tsx"), "utf8");
  const signIn = readFileSync(join(root, "app/sign-in/page.tsx"), "utf8");

  it("driver hub links daily usage without auto-opening form on login", () => {
    assert.match(driver, /href=\"\/driver\/daily-usage\"/);
    assert.match(driver, /Daily usage/);
    assert.doesNotMatch(driver, /createDriverDailyUsage/);
    assert.doesNotMatch(signIn, /\/driver\/daily-usage/);
  });

  it("daily usage task screen gates on travel and lists own entries", () => {
    assert.match(page, /createDriverDailyUsage/);
    assert.match(page, /listDriverDailyUsage/);
    assert.match(page, /Go to Next travel/);
    assert.match(page, /Submit daily usage/);
    assert.match(page, /Your entries/);
    assert.match(page, /odometerUnitLabel/);
    assert.match(page, /You are offline/);
    assert.doesNotMatch(page, /deleteDailyUsage|editDailyUsage/i);
  });
});
