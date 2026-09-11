import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("OA shells (drivers, vehicles, admins, security)", () => {
  const shell = readFileSync(join(root, "components/app-shell.tsx"), "utf8");
  const drivers = readFileSync(join(root, "app/drivers/page.tsx"), "utf8");
  const driversNew = readFileSync(join(root, "app/drivers/new/page.tsx"), "utf8");
  const driversEdit = readFileSync(join(root, "app/drivers/[id]/page.tsx"), "utf8");
  const vehicles = readFileSync(join(root, "app/vehicles/page.tsx"), "utf8");
  const vehiclesNew = readFileSync(join(root, "app/vehicles/new/page.tsx"), "utf8");
  const vehiclesEdit = readFileSync(join(root, "app/vehicles/[id]/page.tsx"), "utf8");
  const admins = readFileSync(join(root, "app/admins/page.tsx"), "utf8");
  const security = readFileSync(join(root, "app/security/page.tsx"), "utf8");
  const changePassword = readFileSync(join(root, "app/change-password/page.tsx"), "utf8");

  it("AppShell nav covers core OA routes and gates unsigned-in", () => {
    assert.match(shell, /href: "\/home"/);
    assert.match(shell, /href: "\/drivers"/);
    assert.match(shell, /href: "\/vehicles"/);
    assert.match(shell, /href: "\/service-due"/);
    assert.match(shell, /href: "\/reports\/daily-usage"/);
    assert.match(shell, /href: "\/security"/);
    assert.match(shell, /href: "\/admins"/);
    assert.match(shell, /router\.replace\("\/sign-in"\)/);
    assert.match(shell, /account_kind/);
  });

  it("drivers list is company-only with invite statuses and add link", () => {
    assert.match(drivers, /<AppShell/);
    assert.match(drivers, /title="Drivers"/);
    assert.match(drivers, /queryDrivers/);
    assert.match(drivers, /account_kind === "individual"/);
    assert.match(drivers, /Login disabled/);
    assert.match(drivers, /Invite pending/);
    assert.match(drivers, /href="\/drivers\/new"/);
    assert.match(drivers, /href=\{`\/drivers\/\$\{d\.id\}`\}/);
  });

  it("driver create/edit use AppShell and company gate", () => {
    assert.match(driversNew, /title="Add driver"/);
    assert.match(driversNew, /account_kind/);
    assert.match(driversNew, /router\.replace\("\/drivers"\)/);
    assert.match(driversEdit, /title="Edit driver"/);
    assert.match(driversEdit, /account_kind/);
    assert.match(driversEdit, /must_change_password|Invite pending|login_enabled/);
  });

  it("vehicles list/create/edit wire query or VehicleForm", () => {
    assert.match(vehicles, /title="Vehicles"/);
    assert.match(vehicles, /queryVehicles/);
    assert.match(vehicles, /href="\/vehicles\/new"/);
    assert.match(vehicles, /href=\{`\/vehicles\/\$\{v\.id\}`\}/);
    assert.match(vehiclesNew, /title="Add vehicle"/);
    assert.match(vehiclesNew, /VehicleForm/);
    assert.match(vehiclesNew, /router\.replace\(`\/vehicles\/\$\{created\.id\}`\)/);
    assert.match(vehiclesEdit, /title="Edit vehicle"/);
    assert.match(vehiclesEdit, /VehicleForm/);
  });

  it("admins is owner+company gated with createAdmin", () => {
    assert.match(admins, /title="Admins"/);
    assert.match(admins, /account_kind === "individual"/);
    assert.match(admins, /Only the Owner can add Admins/);
    assert.match(admins, /createAdmin/);
    assert.match(admins, /password_too_short|At least 8 characters/);
  });

  it("security page uses TOTP status/setup/confirm/disable", () => {
    assert.match(security, /title="Security"/);
    assert.match(security, /totpStatus/);
    assert.match(security, /totpSetup/);
    assert.match(security, /totpConfirm/);
    assert.match(security, /totpDisable/);
    assert.doesNotMatch(security, /DriverShell/);
  });

  it("change-password is invite-only and role-routes after success", () => {
    assert.match(changePassword, /Invitation required|sign-in/i);
    assert.match(changePassword, /router\.replace\("\/sign-in"\)/);
    assert.match(changePassword, /role === "driver" \? "\/driver" : "\/home"/);
  });
});
