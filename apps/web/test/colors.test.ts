import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function cssVars(source: string, selector: ":root" | ".dark"): Map<string, string> {
  const escaped = selector.replace(".", "\\.");
  const block = source.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(block, `missing ${selector} block`);
  const vars = new Map<string, string>();
  for (const match of block[1].matchAll(/(--color-[\w-]+):\s*([^;]+);/g)) {
    vars.set(match[1], match[2].trim());
  }
  assert.ok(vars.size > 0, `${selector} has no --color-* variables`);
  return vars;
}

function assertSamePalette(a: Map<string, string>, b: Map<string, string>, label: string) {
  assert.deepEqual([...a.keys()].sort(), [...b.keys()].sort(), `${label} variable names`);
  for (const [name, value] of a) {
    assert.equal(b.get(name), value, `${label} ${name}`);
  }
}

test("web and mobile share the design semantic color palette", () => {
  const design = readFileSync(join(root, "design/semantic-colors.css"), "utf8");
  const web = readFileSync(join(root, "apps/web/app/globals.css"), "utf8");
  const mobile = readFileSync(join(root, "apps/mobile/global.css"), "utf8");

  for (const selector of [":root", ".dark"] as const) {
    const designVars = cssVars(design, selector);
    assertSamePalette(designVars, cssVars(web, selector), `web ${selector}`);
    assertSamePalette(designVars, cssVars(mobile, selector), `mobile ${selector}`);
  }

  assert.match(web, /background-color:\s*var\(--color-canvas\)/);
  assert.ok(designVarsHasCanvas(design));
});

function designVarsHasCanvas(source: string) {
  return cssVars(source, ":root").get("--color-canvas") === "#f6f8fb";
}
