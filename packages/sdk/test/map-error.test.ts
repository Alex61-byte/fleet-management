import assert from "node:assert/strict";
import { test } from "node:test";
import {
  daysUntilUtc,
  mapAuthError,
  vehiclesNavA11yLabel,
  vehiclesNavUrgency,
  warningA11y,
} from "../src/index.ts";

test("mapAuthError hides credential details", () => {
  assert.equal(mapAuthError("invalid_credentials", "x"), "Sign-in details are not correct.");
  assert.equal(mapAuthError("validation_error", "x"), "Check the email format and try again.");
  assert.equal(mapAuthError("email_in_use", "x"), "This email cannot be used.");
  assert.equal(mapAuthError("totp_invalid", "x"), "That code is not valid.");
  assert.equal(mapAuthError("unknown_code", "Keep this fallback."), "Keep this fallback.");
});

test("warningA11y names plate and dates", () => {
  assert.equal(
    warningA11y("AB-123", [
      { field: "insurance_on", state: "expired" },
      { field: "inspection_on", state: "due_soon" },
    ]),
    "AB-123, insurance expired, inspection due soon",
  );
});

test("daysUntilUtc uses whole UTC calendar days", () => {
  assert.equal(daysUntilUtc("2026-09-10", "2026-09-03"), 7);
  assert.equal(daysUntilUtc("2026-09-09", "2026-09-03"), 6);
  assert.equal(daysUntilUtc("2026-09-02", "2026-09-03"), -1);
  assert.equal(daysUntilUtc("2026-09-03", "2026-09-03"), 0);
});

test("vehiclesNavUrgency worst-wins red over orange", () => {
  const today = "2026-09-03";
  const blank = {
    insurance_on: null,
    inspection_on: null,
    road_tax_on: null,
    registration_on: null,
  };
  assert.equal(vehiclesNavUrgency([], today), "none");
  assert.equal(vehiclesNavUrgency([{ ...blank }], today), "none");
  assert.equal(
    vehiclesNavUrgency([{ ...blank, insurance_on: "2026-09-20" }], today),
    "none",
  );
  assert.equal(
    vehiclesNavUrgency([{ ...blank, insurance_on: "2026-09-10" }], today),
    "warning",
  );
  assert.equal(
    vehiclesNavUrgency([{ ...blank, insurance_on: "2026-09-09" }], today),
    "critical",
  );
  assert.equal(
    vehiclesNavUrgency([{ ...blank, insurance_on: "2026-09-01" }], today),
    "critical",
  );
  assert.equal(
    vehiclesNavUrgency(
      [
        { ...blank, insurance_on: "2026-09-10" },
        { ...blank, inspection_on: "2026-09-05" },
      ],
      today,
    ),
    "critical",
  );
  assert.equal(vehiclesNavA11yLabel("critical"), "Vehicles, critical expiry within 7 days");
  assert.equal(vehiclesNavA11yLabel("warning"), "Vehicles, expiry in 7 days");
  assert.equal(vehiclesNavA11yLabel("none"), "Vehicles");
});
