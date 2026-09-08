import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("vehicle form keyboard avoidance (iOS)", () => {
  const createPage = readFileSync(join(root, "app/(owner)/vehicles/new.tsx"), "utf8");
  const editPage = readFileSync(join(root, "app/(owner)/vehicles/[id].tsx"), "utf8");

  it("create and edit wrap ScrollView in KeyboardAvoidingView for iPhone", () => {
    for (const page of [createPage, editPage]) {
      assert.match(page, /KeyboardAvoidingView/);
      assert.match(page, /behavior=\{Platform\.OS === "ios" \? "padding" : undefined\}/);
      assert.match(page, /keyboardShouldPersistTaps="handled"/);
      assert.match(page, /automaticallyAdjustKeyboardInsets/);
    }
  });
});
