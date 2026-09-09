import assert from "node:assert/strict";
import { test } from "node:test";
import {
  complianceNotificationItems,
  complianceNotificationsA11yLabel,
  daysUntilUtc,
  mapAuthError,
  vehiclesNavA11yLabel,
  vehiclesNavUrgency,
  warningA11y,
  warningFieldLabel,
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
  assert.equal(
    warningA11y(
      "AB-123",
      [{ field: "custom:aaa", state: "expired" }],
      [{ id: "aaa", label: "Fire extinguisher" }],
    ),
    "AB-123, fire extinguisher expired",
  );
  assert.equal(warningFieldLabel("road_tax_on"), "Road tax");
  assert.equal(
    warningFieldLabel("custom:bbb", [{ id: "bbb", label: "Vignette" }]),
    "Vignette",
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
  assert.equal(
    vehiclesNavUrgency(
      [
        {
          ...blank,
          custom_expirations: [{ expires_on: "2026-09-10" }],
        },
      ],
      today,
    ),
    "warning",
  );
  assert.equal(
    vehiclesNavUrgency(
      [
        {
          ...blank,
          custom_expirations: [{ expires_on: "2026-09-01" }],
        },
      ],
      today,
    ),
    "critical",
  );
  assert.equal(vehiclesNavA11yLabel("critical"), "Vehicles, critical expiry within 7 days");
  assert.equal(vehiclesNavA11yLabel("warning"), "Vehicles, expiry in 7 days");
  assert.equal(vehiclesNavA11yLabel("none"), "Vehicles");
});

test("complianceNotificationItems expands warnings, sorts, caps, ignores registration", () => {
  const today = "2026-09-03";
  const base = {
    make: "Ford",
    model: "Transit",
    insurance_on: null as string | null,
    inspection_on: null as string | null,
    road_tax_on: null as string | null,
    custom_expirations: [] as { id: string; label: string; expires_on: string }[],
    warnings: [] as {
      field: string;
      state: "expired" | "due_soon";
    }[],
  };
  assert.deepEqual(complianceNotificationItems([], today), {
    items: [],
    truncated: false,
    total: 0,
  });
  const multi = complianceNotificationItems(
    [
      {
        ...base,
        id: "v1",
        license_plate: "B-02",
        insurance_on: "2026-09-20",
        inspection_on: "2026-09-01",
        road_tax_on: "2026-09-10",
        warnings: [
          { field: "inspection_on", state: "expired" },
          { field: "road_tax_on", state: "due_soon" },
        ],
      },
      {
        ...base,
        id: "v2",
        license_plate: "A-01",
        insurance_on: "2026-08-01",
        warnings: [{ field: "insurance_on", state: "expired" }],
      },
      {
        ...base,
        id: "v3",
        license_plate: "C-03",
        // registration alone must not appear even if client wrongly adds a warning
        warnings: [{ field: "registration_on", state: "due_soon" }],
      },
      {
        ...base,
        id: "v4",
        license_plate: "D-04",
        custom_expirations: [
          { id: "ce1", label: "Fire ext", expires_on: "2026-09-02" },
        ],
        warnings: [{ field: "custom:ce1", state: "expired" }],
      },
    ],
    today,
  );
  assert.equal(multi.total, 4);
  assert.equal(multi.truncated, false);
  assert.deepEqual(
    multi.items.map((i) => `${i.license_plate}:${i.field}:${i.days_until}`),
    [
      "A-01:insurance_on:-33",
      "B-02:inspection_on:-2",
      "D-04:custom:ce1:-1",
      "B-02:road_tax_on:7",
    ],
  );
  assert.equal(
    multi.items.find((i) => i.field === "custom:ce1")?.field_label,
    "Fire ext",
  );

  const many = Array.from({ length: 60 }, (_, i) => ({
    ...base,
    id: `id-${i}`,
    license_plate: `P-${String(i).padStart(2, "0")}`,
    insurance_on: "2026-09-01",
    warnings: [{ field: "insurance_on" as const, state: "expired" as const }],
  }));
  const capped = complianceNotificationItems(many, today, 50);
  assert.equal(capped.total, 60);
  assert.equal(capped.items.length, 50);
  assert.equal(capped.truncated, true);
  assert.equal(complianceNotificationsA11yLabel(0), "Notifications");
  assert.equal(complianceNotificationsA11yLabel(3), "Notifications, 3 compliance alerts");
});
