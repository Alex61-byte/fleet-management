import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const theme = readFileSync(join(root, "../../design/tailwind.theme.ts"), "utf8");
const footer = readFileSync(join(root, "components/app-footer.tsx"), "utf8");
const ui = readFileSync(join(root, "components/ui.tsx"), "utf8");
const shell = readFileSync(join(root, "components/app-shell.tsx"), "utf8");
const driver = readFileSync(join(root, "components/driver-shell.tsx"), "utf8");
const landing = readFileSync(join(root, "app/page.tsx"), "utf8");
const pricing = readFileSync(join(root, "app/pricing/page.tsx"), "utf8");
const billing = readFileSync(join(root, "app/billing/page.tsx"), "utf8");
const terms = readFileSync(join(root, "app/terms/page.tsx"), "utf8");
const privacy = readFileSync(join(root, "app/privacy/page.tsx"), "utf8");

test("theme exposes appFooter tokens", () => {
  assert.match(theme, /appFooter:/);
  assert.match(theme, /appFooterInner:/);
  assert.match(theme, /appFooterInnerPublic:/);
  assert.match(theme, /appFooterCopy:/);
  assert.match(theme, /appFooterNav:/);
});

test("AppFooter is session-aware: Pricing unsigned, Billing OA, Terms+Privacy always", () => {
  assert.match(footer, /© \{year\} Fleet/);
  assert.match(footer, /useAuth/);
  assert.match(footer, /href="\/pricing"/);
  assert.match(footer, /Pricing/);
  assert.match(footer, /href="\/billing"/);
  assert.match(footer, /Billing/);
  assert.match(footer, /href="\/terms"/);
  assert.match(footer, />\s*Terms\s*</);
  assert.match(footer, /href="\/privacy"/);
  assert.match(footer, />\s*Privacy\s*</);
  assert.match(footer, /\/home/);
  assert.match(footer, /\/driver/);
  assert.match(footer, /isOwnerAdmin|role === "driver"|me\?\.role/);
  assert.doesNotMatch(footer, /coming soon/i);
  assert.doesNotMatch(footer, /Stripe|card number/i);
});

test("footer mounts on public, auth, OA, and driver web chrome", () => {
  assert.match(landing, /<AppFooter variant="public"/);
  assert.match(pricing, /<AppFooter variant="public"/);
  assert.match(terms, /<AppFooter variant="public"/);
  assert.match(privacy, /<AppFooter variant="public"/);
  assert.match(ui, /<AppFooter/);
  assert.match(shell, /<AppFooter/);
  assert.match(driver, /<AppFooter/);
});

test("billing page is OA shell placeholder without checkout", () => {
  assert.ok(existsSync(join(root, "app/billing/page.tsx")));
  assert.match(billing, /<AppShell/);
  assert.match(billing, /title="Billing"/);
  assert.match(billing, /Plan &amp; billing|Plan & billing/);
  assert.doesNotMatch(billing, /Stripe|cardNumber|payment_method|Elements|BillingPortal/i);
  assert.doesNotMatch(billing, /api\.(billing|plans)\(/);
});

test("theme exposes terms document tokens", () => {
  assert.match(theme, /termsDocument:/);
  assert.match(theme, /termsSection:/);
  assert.match(theme, /termsSectionTitle:/);
  assert.match(theme, /termsSectionBody:/);
  assert.match(theme, /termsMeta:/);
});

test("terms page is public chrome static copy with required sections", () => {
  assert.ok(existsSync(join(root, "app/terms/page.tsx")));
  assert.match(terms, /pagePublic/);
  assert.match(terms, /publicHeader/);
  assert.match(terms, /Terms and Conditions/);
  assert.match(terms, /termsDocument/);
  assert.match(terms, /Service description/i);
  assert.match(terms, /Accounts and tenancy/i);
  assert.match(terms, /Acceptable use/i);
  assert.match(terms, /Data and tenancy/i);
  assert.match(terms, /Disclaimer/i);
  assert.match(terms, /Limitation of liability/i);
  assert.match(terms, /Changes to terms/i);
  assert.match(terms, /Contact/i);
  assert.doesNotMatch(terms, /type=\"checkbox\"|I agree to the terms/i);
  assert.doesNotMatch(terms, /Stripe|card number|payment_method/i);
  assert.doesNotMatch(terms, /api\.(get|post|billing|terms)/i);
  assert.match(terms, /\/privacy/);
});

test("privacy page is public chrome static copy with required sections", () => {
  assert.ok(existsSync(join(root, "app/privacy/page.tsx")));
  assert.match(privacy, /pagePublic/);
  assert.match(privacy, /publicHeader/);
  assert.match(privacy, /pageTitle\}>Privacy</);
  assert.match(privacy, /termsDocument/);
  assert.match(privacy, /Who we are/i);
  assert.match(privacy, /Scope/i);
  assert.match(privacy, /Personal data we process/i);
  assert.match(privacy, /Purposes and legal bases/i);
  assert.match(privacy, /Sharing and processors/i);
  assert.match(privacy, /International transfers/i);
  assert.match(privacy, /Retention/i);
  assert.match(privacy, /Security/i);
  assert.match(privacy, /Your rights/i);
  assert.match(privacy, /Cookies and similar technologies/i);
  assert.match(privacy, /Children/i);
  assert.match(privacy, /Changes/i);
  assert.match(privacy, /Contact and requests/i);
  assert.doesNotMatch(privacy, /type=\"checkbox\"|I agree to the privacy/i);
  assert.doesNotMatch(privacy, /DSAR portal|data subject request form/i);
  assert.doesNotMatch(privacy, /api\.(get|post|privacy|gdpr)/i);
});
