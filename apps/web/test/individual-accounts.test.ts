import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const shell = readFileSync(join(root, "components/app-shell.tsx"), "utf8");
const drivers = readFileSync(join(root, "app/drivers/page.tsx"), "utf8");
const admins = readFileSync(join(root, "app/admins/page.tsx"), "utf8");
const home = readFileSync(join(root, "app/home/page.tsx"), "utf8");

test("individual owner shell omits Drivers and Admins nav", () => {
  assert.match(shell, /account_kind === "individual"/);
  assert.match(shell, /!individual \? \[\{ href: "\/drivers"/);
  assert.match(shell, /!individual && me\.role === "owner"/);
});

test("drivers and admins deny individual account kind", () => {
  const driversNew = readFileSync(join(root, "app/drivers/new/page.tsx"), "utf8");
  const driversEdit = readFileSync(join(root, "app/drivers/[id]/page.tsx"), "utf8");
  assert.match(drivers, /account_kind === "individual"/);
  assert.match(drivers, /Driver management is only available on company accounts/);
  assert.match(driversNew, /account_kind === "individual"/);
  assert.match(driversEdit, /account_kind === "individual"/);
  assert.match(admins, /account_kind === "individual"/);
  assert.match(admins, /Admins are only available on company accounts/);
});

test("individual home shows vehicles without drivers KPI", () => {
  assert.match(home, /account_kind === "individual"/);
  assert.match(home, /Owner · personal vehicles/);
  assert.match(home, /!individual && home\.driver_count === 0/);
  assert.match(home, /href="\/vehicles\/new">Add vehicle/);
  assert.match(home, /!individual && home\.driver_count === 0 \?[\s\S]*Add driver/);
});

test("individual vehicle form omits Images and Handovers", () => {
  const form = readFileSync(join(root, "components/vehicle-form.tsx"), "utf8");
  assert.match(form, /companyTenant = me\?\.account_kind !== "individual"/);
  assert.match(form, /companyTenant \? \([\s\S]*Images/);
  assert.match(form, /companyTenant && vehicle\?\.id \? \([\s\S]*Handovers/);
  assert.match(form, /companyTenant && tab === "images"/);
  assert.match(form, /companyTenant && tab === "handovers"/);
});
