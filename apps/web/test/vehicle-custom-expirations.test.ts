import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("vehicle custom expirations (web US-86–90)", () => {
  const form = readFileSync(join(root, "components/vehicle-form.tsx"), "utf8");
  const ui = readFileSync(join(root, "components/ui.tsx"), "utf8");
  const list = readFileSync(join(root, "app/vehicles/page.tsx"), "utf8");
  const theme = readFileSync(
    join(root, "../../design/tailwind.theme.ts"),
    "utf8",
  );

  it("renders Custom expirations section after built-in dates on Details", () => {
    assert.match(form, /Custom expirations/);
    assert.match(form, /No custom expirations yet\./);
    assert.match(form, /Add expiration/);
    assert.match(form, /Maximum of 10 custom expirations\./);
    assert.match(form, /vehicleCustomExpirations/);
    assert.match(form, /Expires on/);
    assert.match(theme, /vehicleCustomExpirations/);
    assert.match(theme, /vehicleCustomExpirationRow/);
  });

  it("submits full custom_expirations array and syncs after save", () => {
    assert.match(form, /custom_expirations:\s*customExpirationsWritePayload/);
    assert.match(form, /setCustomExpirations\(draftsFromVehicle/);
    assert.match(form, /serverOwned/);
    assert.match(form, /Label must be unique on this vehicle\./);
    assert.match(form, /Enter a label \(1–80 characters\)\./);
    assert.match(form, /Choose an expiration date\./);
  });

  it("confirms remove with ConfirmDeleteDialog before dropping a row", () => {
    assert.match(form, /Remove custom expiration\?/);
    assert.match(form, /This removes the custom expiration from the vehicle\./);
    assert.match(form, /confirmLabel="Remove"/);
    assert.match(form, /Remove \$\{/);
  });

  it("passes custom_expirations into ExpiryBadges / warningFieldLabel", () => {
    assert.match(ui, /customExpirations/);
    assert.match(ui, /warningFieldLabel\(w\.field,\s*customExpirations\)/);
    assert.match(list, /customExpirations=\{v\.custom_expirations\}/);
    assert.match(list, /v\.custom_expirations/);
  });
});
