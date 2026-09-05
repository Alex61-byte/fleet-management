CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY,
  registration_number TEXT NOT NULL DEFAULT '',
  vat_number TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE companies ADD COLUMN IF NOT EXISTS registration_number TEXT NOT NULL DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS vat_number TEXT NOT NULL DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS principals (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies (id),
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'driver')),
  password_hash TEXT,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  login_enabled BOOLEAN NOT NULL DEFAULT true,
  totp_enabled BOOLEAN NOT NULL DEFAULT false,
  totp_secret TEXT,
  totp_pending_secret TEXT,
  invite_token_hash TEXT,
  invite_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE principals ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE principals ADD COLUMN IF NOT EXISTS invite_token_hash TEXT;
ALTER TABLE principals ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS principals_company_id ON principals (company_id);
CREATE INDEX IF NOT EXISTS principals_invite_token_hash ON principals (invite_token_hash);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY,
  principal_id UUID NOT NULL REFERENCES principals (id),
  token_hash TEXT NOT NULL UNIQUE,
  family_id UUID NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE refresh_tokens
SET expires_at = created_at + INTERVAL '14 days'
WHERE expires_at IS NULL;

ALTER TABLE refresh_tokens
  ALTER COLUMN expires_at SET NOT NULL;

CREATE TABLE IF NOT EXISTS totp_challenges (
  token_hash TEXT PRIMARY KEY,
  principal_id UUID NOT NULL REFERENCES principals (id),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  principal_id UUID NOT NULL REFERENCES principals (id),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies (id),
  make TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  license_plate TEXT NOT NULL DEFAULT '',
  country_of_registration TEXT,
  insurance_on DATE,
  inspection_on DATE,
  road_tax_on DATE,
  registration_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicles_company_id ON vehicles (company_id);

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS make TEXT NOT NULL DEFAULT '';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS model TEXT NOT NULL DEFAULT '';
ALTER TABLE vehicles DROP COLUMN IF EXISTS car;

CREATE TABLE IF NOT EXISTS driver_travel_selections (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies (id),
  driver_id UUID NOT NULL REFERENCES principals (id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles (id),
  odometer DOUBLE PRECISION NOT NULL,
  odometer_unit TEXT NOT NULL CHECK (odometer_unit IN ('mi', 'km')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS driver_travel_driver_id ON driver_travel_selections (driver_id);
CREATE INDEX IF NOT EXISTS driver_travel_company_id ON driver_travel_selections (company_id);
CREATE UNIQUE INDEX IF NOT EXISTS driver_travel_one_active
  ON driver_travel_selections (driver_id) WHERE active = true;
