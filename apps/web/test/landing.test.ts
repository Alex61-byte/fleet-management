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
  assert.match(landing, /themeClasses\.pagePublic/);
  assert.match(landing, /themeClasses\.publicBody/);
  assert.match(landing, /Sign in/);
  assert.match(landing, /Create company/);
  assert.match(landing, /href="\/sign-in"/);
  assert.match(landing, /href="\/sign-up"/);
  assert.match(landing, /Fleet operations/);
  assert.match(landing, /<BrandMarkPublic/);
  assert.match(landing, /router\.replace\("\/home"\)/);
  assert.doesNotMatch(landing, /api\.home\(/);
  assert.doesNotMatch(landing, /AppShell/);
});

test("Owner/Admin home lives under /home", () => {
  assert.match(home, /api\.home\(/);
  assert.match(home, /<AppShell title="Fleet">/);
  assert.match(home, /Due soon or expired/);
});

test("AppShell Home href is /home and unsigned-in stays US-15 denied", () => {
  assert.match(shell, /href: "\/home", label: "Home"/);
  assert.match(shell, /Sign in required/);
  assert.doesNotMatch(shell, /href: "\/", label: "Home"/);
  assert.doesNotMatch(shell, /publicHeader/);
});

test("sign-in branches by role; sign-up goes to /home", () => {
  assert.match(signIn, /router\.replace\("\/home"\)/);
  assert.match(signIn, /router\.replace\("\/driver"\)/);
  assert.doesNotMatch(signIn, /change-password/);
  assert.match(signUp, /router\.replace\("\/home"\)/);
  assert.match(signUp, /registration_number/);
  assert.match(signUp, /vat_number/);
  assert.match(signUp, /address/);
  assert.doesNotMatch(signIn, /router\.replace\("\/"\)/);
  assert.doesNotMatch(signUp, /router\.replace\("\/"\)/);
  assert.doesNotMatch(signIn, /driver_web_not_allowed/);
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
  assert.match(landing, /What Fleet is for/);
  assert.match(landing, /\/landing\/hero-map\.svg/);
  assert.match(landing, /alt="Static street map"/);
  assert.match(landing, /onError/);
  assert.doesNotMatch(landing, /publicIdentity/);
  assert.doesNotMatch(landing, /leaflet/i);
  assert.doesNotMatch(landing, /mapbox/i);
  assert.doesNotMatch(landing, /<iframe/i);
  assert.doesNotMatch(landing, /api\.home\(/);
  assert.doesNotMatch(landing, /AppShell/);
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
