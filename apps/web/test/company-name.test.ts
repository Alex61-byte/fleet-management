import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = join(import.meta.dirname, "..");

test("company name on sign-up and Owner prompt for legacy empty name", () => {
  const signUp = readFileSync(join(root, "app/sign-up/page.tsx"), "utf8");
  assert.match(signUp, /Company name/);
  assert.match(signUp, /name: companyName\.trim\(\)/);

  const dialog = readFileSync(join(root, "components/company-name-dialog.tsx"), "utf8");
  assert.match(dialog, /company_name_required/);
  assert.match(dialog, /setCompanyName/);
  assert.match(dialog, /Add company name/);
  assert.doesNotMatch(dialog, /onCancel/);

  const shell = readFileSync(join(root, "components/app-shell.tsx"), "utf8");
  assert.match(shell, /CompanyNameDialog/);
  assert.match(shell, /company_name/);
});
