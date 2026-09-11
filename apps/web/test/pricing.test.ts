import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { PRICING_PLANS, plansForKind } from "../lib/pricing-catalog";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const page = readFileSync(join(root, "app/pricing/page.tsx"), "utf8");
const landing = readFileSync(join(root, "app/page.tsx"), "utf8");
const catalogDoc = readFileSync(
  join(root, "../../docs/pricing-plans.md"),
  "utf8",
);

test("pricing page uses public chrome and session redirects", () => {
  assert.match(page, /themeClasses\.pagePublic/);
  assert.match(page, /themeClasses\.publicHeader/);
  assert.match(page, /router\.replace\("\/home"\)/);
  assert.match(page, /router\.replace\("\/driver"\)/);
  assert.match(page, /href="\/sign-in"/);
  assert.match(page, /href="\/account-kind"/);
  assert.match(page, /href="\/"/);
  assert.doesNotMatch(page, /AppShell/);
  assert.doesNotMatch(page, /stripe/i);
  assert.doesNotMatch(page, /\/v1\/plans/);
  assert.doesNotMatch(page, /trial/i);
});

test("landing links to pricing", () => {
  assert.match(landing, /href="\/pricing"/);
  assert.match(landing, /Pricing/);
});

test("catalog has four plans and kind split", () => {
  assert.equal(PRICING_PLANS.length, 4);
  assert.equal(plansForKind("individual").length, 2);
  assert.equal(plansForKind("company").length, 2);
});

test("prices match pricing-plans.md", () => {
  assert.match(catalogDoc, /\*\*\$2\.00\*\*\/active vehicle\/mo/);
  assert.match(catalogDoc, /\*\*\$14\*\*\/mo workspace/);
  assert.match(catalogDoc, /\*\*\$7\*\*\/active vehicle\/mo/);
  assert.match(catalogDoc, /\*\*\$11\*\*\/active vehicle\/mo/);
  assert.match(catalogDoc, /\*\*\$0\.80\*\*/);

  const personal = PRICING_PLANS.find((p) => p.code === "individual_personal")!;
  const plus = PRICING_PLANS.find((p) => p.code === "individual_plus")!;
  const team = PRICING_PLANS.find((p) => p.code === "company_team")!;
  const fleet = PRICING_PLANS.find((p) => p.code === "company_fleet")!;
  assert.equal(personal.priceLabel, "$2");
  assert.equal(plus.priceLabel, "$14");
  assert.equal(team.priceLabel, "$7");
  assert.equal(fleet.priceLabel, "$11");
  assert.equal(personal.ctaHref, "/individual-sign-up");
  assert.equal(plus.ctaHref, "/individual-sign-up");
  assert.equal(team.ctaHref, "/sign-up");
  assert.equal(fleet.ctaHref, "/sign-up");
  assert.ok(plus.features.some((f) => f.included && /\$0\.80/.test(f.text)));
  assert.ok(fleet.features.some((f) => f.included && /\$0\.80/.test(f.text)));
  assert.ok(plus.features.some((f) => f.included && /document vault/i.test(f.text)));
  assert.ok(team.features.some((f) => f.included && /usage report/i.test(f.text)));
  assert.ok(personal.features.some((f) => !f.included && /docs|digests|issues/i.test(f.text)));
  assert.ok(team.features.some((f) => !f.included && /Custom expirations/.test(f.text)));
});
