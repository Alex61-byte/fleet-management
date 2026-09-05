import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ui = readFileSync(join(root, "components/ui.tsx"), "utf8");

test("BrandMark is the Fleet registration plate SVG, not a minus bar", () => {
  assert.match(ui, /viewBox="0 0 24 24"/);
  assert.match(ui, /<rect x="1" y="1" width="22" height="22" rx="5"/);
  assert.match(ui, /<rect x="2" y="2" width="20" height="20" rx="4"/);
  assert.match(ui, /<rect x="4" y="8" width="16" height="8" rx="1.5"/);
  assert.match(
    ui,
    /d="M5\.5 8H7\.5V16H5\.5A1\.5 1\.5 0 0 1 4 14\.5v-5A1\.5 1\.5 0 0 1 5\.5 8Z"/,
  );
  assert.match(ui, /<circle cx="5\.75" cy="12" r="0\.9"/);
  assert.match(ui, /<rect x="8\.5" y="10" width="2\.25" height="4" rx="0\.4"/);
  assert.match(ui, /<rect x="11\.5" y="10" width="2\.25" height="4" rx="0\.4"/);
  assert.match(ui, /<rect x="14\.5" y="10" width="2\.25" height="4" rx="0\.4"/);
  assert.match(ui, /<circle cx="18\.25" cy="12" r="0\.9"/);
  assert.match(ui, /themeClasses\.brandMarkGlyph/);
  assert.match(ui, /themeClasses\.brandMarkFill/);
  assert.match(ui, /themeClasses\.brandMarkAccent/);
  assert.doesNotMatch(ui, /bg-mark-fill/);
  assert.doesNotMatch(ui, /left-\[21%\]/);
  assert.doesNotMatch(ui, /fill="#/);
});

test("AuthLockup keeps Fleet wordmark and operations caption", () => {
  assert.match(ui, /<BrandMark variant="auth" \/>/);
  assert.match(ui, /themeClasses\.authWordmark}>Fleet</);
  assert.match(ui, /themeClasses\.authCaptionLockup}>Fleet operations</);
});

const publicMark = ui.slice(ui.indexOf("export function BrandMarkPublic"));
const shieldedMark = ui.slice(ui.indexOf("export function BrandMark("), ui.indexOf("export function BrandMarkPublic"));

test("BrandMarkPublic is the unshielded 40x20 plate, not the navy shield", () => {
  assert.match(publicMark, /viewBox="0 0 40 20"/);
  assert.match(publicMark, /width="40"/);
  assert.match(publicMark, /height="20"/);
  assert.match(publicMark, /themeClasses\.brandMarkPublic/);
  assert.match(publicMark, /themeClasses\.brandMarkPlateFace/);
  assert.match(publicMark, /themeClasses\.brandMarkPlateEdge/);
  assert.match(publicMark, /themeClasses\.brandMarkFill/);
  assert.match(publicMark, /themeClasses\.brandMarkAccent/);
  assert.match(
    publicMark,
    /d="M3\.75 0H8\.75V20H3\.75A3\.75 3\.75 0 0 1 0 16\.25V3\.75A3\.75 3\.75 0 0 1 3\.75 0Z"/,
  );
  assert.doesNotMatch(publicMark, /width="22" height="22"/);
  assert.doesNotMatch(publicMark, /width="20" height="20"/);
  assert.doesNotMatch(publicMark, /<rect x="1" y="1" width="22" height="22"/);
  assert.doesNotMatch(publicMark, /<rect x="2" y="2" width="20" height="20"/);
  assert.doesNotMatch(publicMark, /fill="#/);
});

test("shielded BrandMark still has the 22x22 keyline and 20x20 shield", () => {
  assert.match(shieldedMark, /viewBox="0 0 24 24"/);
  assert.match(shieldedMark, /<rect x="1" y="1" width="22" height="22" rx="5"/);
  assert.match(shieldedMark, /<rect x="2" y="2" width="20" height="20" rx="4"/);
});
