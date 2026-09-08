import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const accountKind = readFileSync(join(root, "app/account-kind.tsx"), "utf8");
const individual = readFileSync(join(root, "app/individual-sign-up.tsx"), "utf8");
const signIn = readFileSync(join(root, "app/sign-in.tsx"), "utf8");
const signUp = readFileSync(join(root, "app/sign-up.tsx"), "utf8");
const ownerLayout = readFileSync(join(root, "app/(owner)/_layout.tsx"), "utf8");
const ownerHome = readFileSync(join(root, "app/(owner)/index.tsx"), "utf8");
const more = readFileSync(join(root, "app/(owner)/more/index.tsx"), "utf8");
const drivers = readFileSync(join(root, "app/(owner)/drivers/index.tsx"), "utf8");

test("mobile account kind chooser routes to company and individual sign-up", () => {
  assert.match(accountKind, /Create account/);
  assert.match(accountKind, /Choose how you will use Fleet\./);
  assert.match(accountKind, /\/sign-up/);
  assert.match(accountKind, /\/individual-sign-up/);
  assert.match(signIn, /\/account-kind/);
  assert.match(signIn, /Create account/);
  assert.match(signUp, /Back to account type/);
});

test("mobile individual sign-up uses registerIndividual only", () => {
  assert.match(individual, /registerIndividual/);
  assert.match(individual, /Create individual account/);
  assert.doesNotMatch(individual, /registration_number/);
});

test("mobile individual shell hides drivers tab and admins entry", () => {
  const driversNew = readFileSync(join(root, "app/(owner)/drivers/new.tsx"), "utf8");
  const driversEdit = readFileSync(join(root, "app/(owner)/drivers/[id].tsx"), "utf8");
  assert.match(ownerLayout, /account_kind === "individual"/);
  assert.match(ownerLayout, /href: me\.account_kind === "individual" \? null/);
  assert.match(ownerHome, /account_kind === "individual"/);
  assert.match(ownerHome, /Owner · personal vehicles/);
  assert.match(ownerHome, /Add vehicle/);
  assert.match(more, /account_kind !== "individual"/);
  assert.match(drivers, /Driver management is only available on company accounts/);
  assert.match(driversNew, /account_kind === "individual"/);
  assert.match(driversEdit, /account_kind === "individual"/);
});

test("mobile individual vehicle form omits Images and Handovers", () => {
  const form = readFileSync(join(root, "components/vehicle-form.tsx"), "utf8");
  assert.match(form, /companyTenant = me\?\.account_kind !== "individual"/);
  assert.match(form, /companyTenant \? \([\s\S]*Images/);
  assert.match(form, /companyTenant && vehicle\?\.id \? \([\s\S]*Handovers/);
  assert.match(form, /companyTenant && tab === "images"/);
  assert.match(form, /companyTenant && tab === "handovers"/);
});
