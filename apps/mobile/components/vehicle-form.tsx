import { WARNING_FIELD_LABEL, type Vehicle, type VehicleWrite, type WarningField } from "@fleet/sdk";
import { useState } from "react";
import { Text, View } from "react-native";
import { Field, PrimaryButton, TextInput } from "./ui";

const DATE_FIELDS: WarningField[] = [
  "insurance_on",
  "inspection_on",
  "road_tax_on",
  "registration_on",
];

/** Date fields need YYYY-MM-DD; tolerate ISO timestamps from API. */
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

  return (
    <View className="gap-2">
      <Field label="Make">
        <TextInput value={make} onChangeText={setMake} />
      </Field>
      <Field label="Model">
        <TextInput value={model} onChangeText={setModel} />
      </Field>
      <Field label="License plate">
        <TextInput value={plate} onChangeText={setPlate} autoCapitalize="characters" />
      </Field>
      <Field label="Country of registration">
        <TextInput value={country} onChangeText={setCountry} />
      </Field>
      {DATE_FIELDS.map((field) => {
        const warning = initial?.warnings.find((w) => w.field === field);
        return (
          <Field key={field} label={WARNING_FIELD_LABEL[field]}>
            <TextInput
              value={dates[field]}
              onChangeText={(v) => setDates((d) => ({ ...d, [field]: v }))}
              placeholder="YYYY-MM-DD"
            />
            {warning ? (
              <Text className={warning.state === "expired" ? "text-danger text-caption" : "text-warning text-caption"}>
                {warning.state === "expired" ? "Expired" : "Due soon"}
              </Text>
            ) : null}
          </Field>
        );
      })}
      <PrimaryButton
        title={submitLabel}
        busy={busy}
        disabled={offline}
        onPress={() => {
          void (async () => {
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
          })();
        }}
      />
    </View>
  );
}
