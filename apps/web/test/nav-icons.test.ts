import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const navIcons = readFileSync(join(root, "components/nav-icons.tsx"), "utf8");
const shell = readFileSync(join(root, "components/app-shell.tsx"), "utf8");

test("NavIcon exposes the six US-31/32 metaphor keys", () => {
  assert.match(navIcons, /export type NavIconName = "home" \| "users" \| "truck" \| "shield" \| "user-cog" \| "more"/);
  assert.match(navIcons, /viewBox="0 0 24 24"/);
  assert.match(navIcons, /strokeWidth: 1\.75/);
  assert.match(navIcons, /stroke: "currentColor"/);
  assert.match(navIcons, /fill: "none"/);
  assert.match(navIcons, /themeClasses\.navIcon/);
  assert.match(navIcons, /aria-hidden="true"/);
  assert.doesNotMatch(navIcons, /fill="#/);
  assert.doesNotMatch(navIcons, /stroke="#/);
  assert.doesNotMatch(navIcons, /lucide/i);
});

test("AppShell renders decorative NavIcon beside each nav label", () => {
  assert.match(shell, /import \{ NavIcon, navIconForHref \} from "\.\/nav-icons"/);
  assert.match(shell, /<NavIcon name=\{navIconForHref\(item\.href\)\} \/>/);
  assert.match(shell, /\{item\.label\}/);
  assert.match(shell, /vehiclesNavA11yLabel\(urgency\)/);
  assert.match(shell, /navItemUrgencyCritical|navItemUrgencySoon/);
});

test("navIconForHref maps destinations to metaphors", () => {
  assert.match(navIcons, /case "\/home":\s*return "home"/);
  assert.match(navIcons, /case "\/drivers":\s*return "users"/);
  assert.match(navIcons, /case "\/vehicles":\s*return "truck"/);
  assert.match(navIcons, /case "\/security":\s*return "shield"/);
  assert.match(navIcons, /case "\/admins":\s*return "user-cog"/);
});
