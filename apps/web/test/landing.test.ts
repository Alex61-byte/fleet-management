import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const landing = readFileSync(join(root, "app/page.tsx"), "utf8");
const home = readFileSync(join(root, "app/home/page.tsx"), "utf8");
const shell = readFileSync(join(root, "components/app-shell.tsx"), "utf8");
const layout = readFileSync(join(root, "app/layout.tsx"), "utf8");
const signIn = readFileSync(join(root, "app/sign-in/page.tsx"), "utf8");
const signUp = readFileSync(join(root, "app/sign-up/page.tsx"), "utf8");
const passwordForgot = readFileSync(join(root, "app/password/forgot/page.tsx"), "utf8");
const passwordReset = readFileSync(join(root, "app/password/reset/page.tsx"), "utf8");

test("public landing uses identity chrome, not ops records", () => {
  assert.match(landing, /themeClasses\.publicHeader/);
  assert.match(landing, /themeClasses\.publicHeaderInner/);
  assert.match(landing, /themeClasses\.pagePublic/);
  assert.match(landing, /themeClasses\.publicBody/);
  assert.match(
    readFileSync(join(root, "../../design/tailwind.theme.ts"), "utf8"),
    /max-w-public-content/,
  );
  assert.match(
    readFileSync(join(root, "../../design/tokens/spacing.json"), "utf8"),
    /"public-content-max".*1200px/,
  );
  assert.match(landing, /Sign in/);
  assert.match(landing, /Create account/);
  assert.match(landing, /href="\/sign-in"/);
  assert.match(landing, /href="\/account-kind"/);
  assert.match(landing, /href="\/pricing"/);
  assert.match(landing, /Fleet operations/);
  assert.match(landing, /<BrandMarkPublic/);
  assert.match(landing, /router\.replace\("\/home"\)/);
  assert.doesNotMatch(landing, /api\.home\(/);
  assert.doesNotMatch(landing, /AppShell/);
});

test("Owner/Admin home lives under /home", () => {
  assert.match(home, /queryHome\(/);
  assert.match(home, /<AppShell/);
  assert.match(home, /title="Home"/);
  assert.match(home, /Due soon or expired/);
  assert.match(home, /Add vehicle/);
});

test("AppShell Home href is /home and unsigned-in redirects to sign-in", () => {
  assert.match(shell, /href: "\/home", label: "Home"/);
  assert.match(shell, /router\.replace\("\/sign-in"\)/);
  assert.doesNotMatch(shell, /Sign in required/);
  assert.doesNotMatch(shell, /href: "\/", label: "Home"/);
  assert.doesNotMatch(shell, /publicHeader/);
});

test("sign-in branches by role; sign-up goes to /home", () => {
  assert.match(signIn, /router\.replace\("\/home"\)/);
  assert.match(signIn, /router\.replace\("\/driver"\)/);
  assert.doesNotMatch(signIn, /change-password/);
  assert.match(signIn, /href="\/account-kind"/);
  assert.match(signIn, /Create account/);
  assert.match(signUp, /router\.replace\("\/home"\)/);
  assert.match(signUp, /registration_number/);
  assert.match(signUp, /vat_number/);
  assert.match(signUp, /address/);
  assert.match(signUp, /Back to account type/);
  assert.match(signUp, /href="\/account-kind"/);
  assert.doesNotMatch(signIn, /router\.replace\("\/"\)/);
  assert.doesNotMatch(signUp, /router\.replace\("\/"\)/);
  assert.doesNotMatch(signIn, /driver_web_not_allowed/);
});

test("account kind chooser and individual sign-up", () => {
  const accountKind = readFileSync(join(root, "app/account-kind/page.tsx"), "utf8");
  const individual = readFileSync(join(root, "app/individual-sign-up/page.tsx"), "utf8");
  assert.match(accountKind, /Create account/);
  assert.match(accountKind, /Choose how you will use Fleet\./);
  assert.match(accountKind, /href="\/sign-up"/);
  assert.match(accountKind, /href="\/individual-sign-up"/);
  assert.match(individual, /registerIndividual/);
  assert.match(individual, /Create individual account/);
  assert.doesNotMatch(individual, /registration_number/);
  assert.match(shell, /account_kind === "individual"/);
  assert.match(home, /account_kind === "individual"/);
});

test("AppShell driver on Owner routes is E8 denied with back to driver home", () => {
  assert.match(shell, /Not available/);
  assert.match(shell, /This area is for Owners and Admins\./);
  assert.match(shell, /Back to home/);
  assert.match(shell, /\/driver/);
  assert.doesNotMatch(shell, /\/change-password/);
  assert.doesNotMatch(shell, /Drivers cannot use the web app/);
});

test("auth canvas and root layout do not include publicHeader", () => {
  assert.doesNotMatch(layout, /publicHeader/);
  assert.doesNotMatch(signIn, /publicHeader/);
  assert.doesNotMatch(signUp, /publicHeader/);
  assert.doesNotMatch(passwordForgot, /publicHeader/);
  assert.doesNotMatch(passwordReset, /publicHeader/);
});

test("public landing uses hero, description, and static map image", () => {
  assert.match(landing, /themeClasses\.publicHero/);
  assert.match(landing, /themeClasses\.publicDescription/);
  assert.match(landing, /themeClasses\.publicValueGrid/);
  assert.match(landing, /themeClasses\.publicPathRow/);
  assert.match(landing, /What Fleet is for/);
  assert.match(landing, /Compliance dates/);
  assert.match(landing, /View pricing/);
  assert.match(landing, /Create company/);
  assert.match(landing, /Create personal account/);
  assert.match(landing, /href="\/sign-up"/);
  assert.match(landing, /href="\/individual-sign-up"/);
  assert.match(landing, /\/landing\/hero-map\.svg/);
  assert.match(landing, /alt="Static street map"/);
  assert.match(landing, /onError/);
  assert.doesNotMatch(landing, /publicIdentity/);
  assert.doesNotMatch(landing, /leaflet/i);
  assert.doesNotMatch(landing, /mapbox/i);
  assert.doesNotMatch(landing, /<iframe/i);
  assert.doesNotMatch(landing, /api\.home\(/);
  assert.doesNotMatch(landing, /AppShell/);
  assert.doesNotMatch(landing, /testimonial/i);
  assert.ok(existsSync(join(root, "public/landing/hero-map.svg")));
});

test("auth pages do not include publicHero", () => {
  assert.doesNotMatch(signIn, /publicHero/);
  assert.doesNotMatch(signUp, /publicHero/);
  assert.doesNotMatch(passwordForgot, /publicHero/);
  assert.doesNotMatch(passwordReset, /publicHero/);
});

test("invite accept page exists and uses preview/accept", () => {
  const invite = readFileSync(join(root, "app/invite/page.tsx"), "utf8");
  assert.match(invite, /previewInvite/);
  assert.match(invite, /acceptInvite/);
  assert.match(invite, /useSearchParams/);
});
