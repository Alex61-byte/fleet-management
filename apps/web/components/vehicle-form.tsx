"use client";

import { WARNING_FIELD_LABEL, type Vehicle, type VehicleWrite, type WarningField } from "@fleet/sdk";
import { FormEvent, useState } from "react";
import { Field, PrimaryButton, TextInput } from "./ui";
import { themeClasses } from "../../../design/tailwind.theme";

const DATE_FIELDS: WarningField[] = [
  "insurance_on",
  "inspection_on",
  "road_tax_on",
  "registration_on",
];

/** `input type="date"` needs YYYY-MM-DD; tolerate ISO timestamps from API. */
function dateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match?.[1] ?? "";
}

export function VehicleForm({
  initial,
  offline,
  submitLabel,
  onSubmit,
}: {
  initial?: Vehicle;
  offline: boolean;
  submitLabel: string;
  onSubmit: (body: VehicleWrite) => Promise<void>;
}) {
  const [make, setMake] = useState(initial?.make ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [plate, setPlate] = useState(initial?.license_plate ?? "");
  const [country, setCountry] = useState(initial?.country_of_registration ?? "");
  const [dates, setDates] = useState<Record<WarningField, string>>({
    insurance_on: dateInputValue(initial?.insurance_on),
    inspection_on: dateInputValue(initial?.inspection_on),
    road_tax_on: dateInputValue(initial?.road_tax_on),
    registration_on: dateInputValue(initial?.registration_on),
  });
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit({
        make: make.trim(),
        model: model.trim(),
        license_plate: plate.trim(),
        country_of_registration: country || null,
        insurance_on: dates.insurance_on || null,
        inspection_on: dates.inspection_on || null,
        road_tax_on: dates.road_tax_on || null,
        registration_on: dates.registration_on || null,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="flex flex-col gap-2 max-w-[400px]" onSubmit={submit}>
      <Field label="Make">
        <TextInput value={make} onChange={(e) => setMake(e.target.value)} required disabled={busy} />
      </Field>
      <Field label="Model">
        <TextInput value={model} onChange={(e) => setModel(e.target.value)} required disabled={busy} />
      </Field>
      <Field label="License plate">
        <TextInput value={plate} onChange={(e) => setPlate(e.target.value)} required disabled={busy} />
      </Field>
      <Field label="Country of registration">
        <TextInput value={country} onChange={(e) => setCountry(e.target.value)} disabled={busy} />
      </Field>
      {DATE_FIELDS.map((field) => {
        const warning = initial?.warnings.find((w) => w.field === field);
        return (
          <Field key={field} label={WARNING_FIELD_LABEL[field]}>
            <TextInput
              type="date"
              value={dates[field]}
              onChange={(e) => setDates((d) => ({ ...d, [field]: e.target.value }))}
              disabled={busy}
            />
            {warning ? (
              <span
                className={
                  warning.state === "expired" ? themeClasses.badgeExpired : themeClasses.badgeWarning
                }
              >
                {warning.state === "expired" ? "Expired" : "Due soon"}
              </span>
            ) : null}
          </Field>
        );
      })}
      <PrimaryButton type="submit" busy={busy} disabled={offline}>
        {submitLabel}
      </PrimaryButton>
    </form>
  );
}
