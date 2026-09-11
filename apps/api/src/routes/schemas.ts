export const registerBody = {
  type: "object",
  required: ["email", "password", "name", "registration_number", "vat_number", "address"],
  additionalProperties: false,
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 1 },
    name: { type: "string", minLength: 1, maxLength: 120 },
    registration_number: { type: "string", minLength: 1, maxLength: 64 },
    vat_number: { type: "string", minLength: 1, maxLength: 64 },
    address: { type: "string", minLength: 1, maxLength: 500 },
  },
} as const;

export const companyNameBody = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1, maxLength: 120 },
  },
} as const;

export const emailPassword = {
  type: "object",
  required: ["email", "password"],
  additionalProperties: false,
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 1 },
  },
} as const;

export const registerIndividualBody = {
  type: "object",
  required: ["email", "password"],
  additionalProperties: false,
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 1 },
  },
} as const;

export const loginBody = {
  type: "object",
  required: ["email", "password", "client"],
  additionalProperties: false,
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 1 },
    client: { type: "string", enum: ["web", "mobile"] },
  },
} as const;

export const vehicleWrite = {
  type: "object",
  additionalProperties: false,
  properties: {
    make: { type: "string" },
    model: { type: "string" },
    license_plate: { type: "string" },
    country_of_registration: { type: ["string", "null"] },
    // null first so AJV does not coerce null → 0 via number branch
    mileage: {
      anyOf: [{ type: "null" }, { type: "string" }, { type: "number" }],
    },
    insurance_on: { type: ["string", "null"] },
    inspection_on: { type: ["string", "null"] },
    road_tax_on: { type: ["string", "null"] },
    registration_on: { type: ["string", "null"] },
    // Shape validated in FleetService (full replace / cap / labels); array|absent only here.
    custom_expirations: {
      type: "array",
      items: { type: "object" },
    },
  },
} as const;

export type VehicleWriteBody = {
  make?: string;
  model?: string;
  license_plate?: string;
  country_of_registration?: string | null;
  mileage?: number | string | null;
  insurance_on?: string | null;
  inspection_on?: string | null;
  road_tax_on?: string | null;
  registration_on?: string | null;
  /** Runtime shape checked in FleetService.parseCustomExpirations. */
  custom_expirations?: unknown;
};
