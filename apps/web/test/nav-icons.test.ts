import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const navIcons = readFileSync(join(root, "components/nav-icons.tsx"), "utf8");
const shell = readFileSync(join(root, "components/app-shell.tsx"), "utf8");
const notif = readFileSync(join(root, "components/notification-menu.tsx"), "utf8");

test("NavIcon exposes US-31/32 nav metaphors plus US-70 bell chrome glyph", () => {
  assert.match(navIcons, /"home"/);
  assert.match(navIcons, /"users"/);
  assert.match(navIcons, /"truck"/);
  assert.match(navIcons, /"shield"/);
  assert.match(navIcons, /"user-cog"/);
  assert.match(navIcons, /"more"/);
  assert.match(navIcons, /"bell"/);
  assert.match(navIcons, /bell: BellGlyph/);
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

test("AppShell Global Header has Fleet mark and notification control (US-68–US-76)", () => {
  assert.match(shell, /themeClasses\.globalHeader/);
  assert.match(shell, /BrandMark/);
  assert.match(shell, /globalHeaderProduct/);
  assert.match(shell, /NotificationControl/);
  assert.match(shell, /sidebarRole/);
  assert.match(shell, /useComplianceNotifications/);
  assert.doesNotMatch(shell, /<p className=\{`\$\{themeClasses\.sidebarMeta\}/);
});

test("Notification menu covers open/close states and alerts copy", () => {
  assert.match(notif, /Alerts/);
  assert.match(notif, /No alerts/);
  assert.match(notif, /role="dialog"/);
  assert.match(notif, /Notifications/);
  assert.match(notif, /itemHref/);
  assert.match(notif, /name="bell"/);
  assert.match(notif, /open_out|service/);
});

test("Notification popover uses fixed readable width not bell hit-target width", () => {
  const theme = readFileSync(
    join(root, "../../design/tailwind.theme.ts"),
    "utf8",
  );
  assert.match(theme, /"notif-menu": "480px"/);
  assert.match(theme, /notifMenuPopover:[\s\S]*w-notif-menu/);
  assert.doesNotMatch(
    theme,
    /notifMenuPopover:\s*\n\s*"z-30 w-full max-w-notif-menu/,
  );
});

test("navIconForHref maps destinations to metaphors", () => {
  assert.match(navIcons, /case "\/home":\s*return "home"/);
  assert.match(navIcons, /case "\/drivers":\s*return "users"/);
  assert.match(navIcons, /case "\/vehicles":\s*return "truck"/);
  assert.match(navIcons, /case "\/security":\s*return "shield"/);
  assert.match(navIcons, /case "\/admins":\s*return "user-cog"/);
});
