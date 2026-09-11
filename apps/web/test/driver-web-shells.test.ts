import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("driver web shells (US-10 hub + travel/handover/usage)", () => {
  const shell = readFileSync(join(root, "components/driver-shell.tsx"), "utf8");
  const home = readFileSync(join(root, "app/driver/page.tsx"), "utf8");
  const travel = readFileSync(join(root, "app/driver/travel/page.tsx"), "utf8");
  const handover = readFileSync(join(root, "app/driver/handover/page.tsx"), "utf8");
  const daily = readFileSync(join(root, "app/driver/daily-usage/page.tsx"), "utf8");

  it("DriverShell signs out to sign-in and defaults back link to /driver", () => {
    assert.match(shell, /Sign out/);
    assert.match(shell, /\/sign-in/);
    assert.match(shell, /href = "\/driver"/);
    assert.match(shell, /Back to Home/);
    assert.doesNotMatch(shell, /href: "\/vehicles"/);
    assert.doesNotMatch(shell, /AppShell/);
  });

  it("driver home is hub only: travel/handover/usage links + getDriverTravel", () => {
    assert.match(home, /DriverShell/);
    assert.match(home, /title="Home"/);
    assert.match(home, /getDriverTravel/);
    assert.match(home, /href="\/driver\/travel"/);
    assert.match(home, /title="Next travel"/);
    assert.match(home, /href="\/driver\/handover"/);
    assert.match(home, /title="Vehicle handover"/);
    assert.match(home, /href="\/driver\/daily-usage"/);
    assert.match(home, /Daily usage/);
    assert.match(home, /router\.replace\("\/sign-in"\)/);
    assert.match(home, /router\.replace\("\/home"\)/);
    assert.doesNotMatch(home, /createDriverHandover|createDriverDailyUsage/);
  });

  it("travel page loads vehicles and travel selection APIs", () => {
    assert.match(travel, /DriverShell/);
    assert.match(travel, /title="Next travel"/);
    assert.match(travel, /listDriverVehicles/);
    assert.match(travel, /getDriverTravel/);
    assert.match(travel, /router\.replace\("\/sign-in"\)/);
    assert.match(travel, /router\.replace\("\/home"\)/);
  });

  it("handover and daily-usage gate on next travel", () => {
    assert.match(handover, /title="Handover"/);
    assert.match(handover, /getDriverTravel/);
    assert.match(handover, /href="\/driver\/travel"/);
    assert.match(daily, /title="Daily usage"/);
    assert.match(daily, /listDriverDailyUsage/);
    assert.match(daily, /getDriverTravel/);
    assert.match(daily, /href="\/driver\/travel"/);
  });
});
