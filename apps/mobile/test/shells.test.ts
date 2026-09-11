import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("mobile shells (auth, driver hub, owner vehicles)", () => {
  const signIn = readFileSync(join(root, "app/sign-in.tsx"), "utf8");
  const changePassword = readFileSync(join(root, "app/change-password.tsx"), "utf8");
  const driverLayout = readFileSync(join(root, "app/(driver)/_layout.tsx"), "utf8");
  const ownerLayout = readFileSync(join(root, "app/(owner)/_layout.tsx"), "utf8");
  const driverHome = readFileSync(join(root, "app/(driver)/index.tsx"), "utf8");
  const travel = readFileSync(join(root, "app/(driver)/travel.tsx"), "utf8");
  const handover = readFileSync(join(root, "app/(driver)/handover.tsx"), "utf8");
  const daily = readFileSync(join(root, "app/(driver)/daily-usage.tsx"), "utf8");
  const denied = readFileSync(join(root, "app/(driver)/denied.tsx"), "utf8");
  const vehicles = readFileSync(join(root, "app/(owner)/vehicles/index.tsx"), "utf8");
  const vehiclesNew = readFileSync(join(root, "app/(owner)/vehicles/new.tsx"), "utf8");

  it("sign-in routes by role and links account-kind + password forgot", () => {
    assert.match(signIn, /router\.replace\("\/\(driver\)"\)/);
    assert.match(signIn, /router\.replace\("\/\(owner\)"\)/);
    assert.match(signIn, /href="\/account-kind"/);
    assert.match(signIn, /href="\/password-forgot"/);
    assert.match(signIn, /totp|Totp|challenge/i);
  });

  it("change-password redirects signed-in users to role home", () => {
    assert.match(changePassword, /Redirect href=\{me\.role === "driver" \? "\/\(driver\)" : "\/\(owner\)"\}/);
    assert.match(changePassword, /href="\/sign-in"/);
  });

  it("driver layout requires driver role; owner layout blocks drivers", () => {
    assert.match(driverLayout, /Redirect href="\/sign-in"/);
    assert.match(driverLayout, /role !== "driver"/);
    assert.match(driverLayout, /Redirect href="\/\(owner\)"/);
    assert.match(ownerLayout, /Redirect href="\/sign-in"/);
    assert.match(ownerLayout, /role === "driver"/);
    assert.match(ownerLayout, /Redirect href="\/\(driver\)\/denied"/);
    assert.match(ownerLayout, /title: "Home"/);
    assert.match(ownerLayout, /title: "Drivers"/);
    assert.match(ownerLayout, /title: "Vehicles"/);
    assert.match(ownerLayout, /account_kind === "individual"/);
  });

  it("driver home hub links travel/handover/daily-usage and loads travel", () => {
    assert.match(driverHome, /getDriverTravel/);
    assert.match(driverHome, /href="\/\(driver\)\/travel"/);
    assert.match(driverHome, /href="\/\(driver\)\/handover"/);
    assert.match(driverHome, /href="\/\(driver\)\/daily-usage"/);
    assert.match(driverHome, /Next travel/);
    assert.match(driverHome, /Vehicle handover/);
    assert.doesNotMatch(driverHome, /createDriverHandover|createDriverDailyUsage/);
  });

  it("driver travel/handover/daily-usage and denied wiring", () => {
    assert.match(travel, /listDriverVehicles/);
    assert.match(travel, /getDriverTravel/);
    assert.match(travel, /router\.replace\("\/\(driver\)"\)/);
    assert.match(handover, /getDriverTravel/);
    assert.match(handover, /\/\(driver\)\/travel/);
    assert.match(daily, /listDriverDailyUsage/);
    assert.match(daily, /getDriverTravel/);
    assert.match(daily, /\/\(driver\)\/travel/);
    assert.match(denied, /router\.replace\("\/\(driver\)"\)/);
  });

  it("owner vehicles list/create use API and VehicleForm", () => {
    assert.match(vehicles, /listVehicles/);
    assert.match(vehicles, /title: "Vehicles"/);
    assert.match(vehicles, /href="\/\(owner\)\/vehicles\/new"/);
    assert.match(vehicles, /href=\{`\/\(owner\)\/vehicles\/\$\{v\.id\}`\}/);
    assert.match(vehiclesNew, /VehicleForm/);
    assert.match(vehiclesNew, /router\.replace\(`\/\(owner\)\/vehicles\/\$\{created\.id\}`\)/);
  });
});
