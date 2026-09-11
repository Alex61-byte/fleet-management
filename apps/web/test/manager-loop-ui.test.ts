import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("manager loop UI (US-93–99 web)", () => {
  const shell = readFileSync(join(root, "components/app-shell.tsx"), "utf8");
  const form = readFileSync(join(root, "components/vehicle-form.tsx"), "utf8");
  const docs = readFileSync(join(root, "components/vehicle-documents-tab.tsx"), "utf8");
  const issues = readFileSync(join(root, "components/vehicle-issues-tab.tsx"), "utf8");
  const serviceDue = readFileSync(join(root, "app/service-due/page.tsx"), "utf8");
  const report = readFileSync(join(root, "app/reports/daily-usage/page.tsx"), "utf8");
  const catalog = readFileSync(join(root, "lib/pricing-catalog.ts"), "utf8");

  it("nav exposes service due and company usage report", () => {
    assert.match(shell, /href: "\/service-due"/);
    assert.match(shell, /href: "\/reports\/daily-usage"/);
  });

  it("vehicle form has documents and issues tabs", () => {
    assert.match(form, /VehicleDocumentsTab/);
    assert.match(form, /VehicleIssuesTab/);
    assert.match(form, /Documents/);
    assert.match(form, /Issues/);
  });

  it("documents and issues call SDK methods", () => {
    assert.match(docs, /uploadVehicleDocument/);
    assert.match(docs, /listVehicleDocuments/);
    assert.match(docs, /deleteVehicleDocument/);
    assert.match(issues, /createVehicleIssue/);
    assert.match(issues, /closeVehicleIssue/);
  });

  it("service due and report pages load lists", () => {
    assert.match(serviceDue, /listServiceDue/);
    assert.match(report, /listCompanyDailyUsage/);
    assert.match(report, /downloadCompanyDailyUsageCsv/);
  });

  it("pricing catalog v2 prices", () => {
    assert.match(catalog, /priceLabel: "\$2"/);
    assert.match(catalog, /priceLabel: "\$14"/);
    assert.match(catalog, /priceLabel: "\$7"/);
    assert.match(catalog, /priceLabel: "\$11"/);
  });
});
