CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY,
  account_kind TEXT NOT NULL DEFAULT 'company' CHECK (account_kind IN ('company', 'individual')),
  registration_number TEXT NOT NULL DEFAULT '',
  vat_number TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE companies ADD COLUMN IF NOT EXISTS registration_number TEXT NOT NULL DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS vat_number TEXT NOT NULL DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS account_kind TEXT;
UPDATE companies SET account_kind = 'company' WHERE account_kind IS NULL;
ALTER TABLE companies ALTER COLUMN account_kind SET DEFAULT 'company';
ALTER TABLE companies ALTER COLUMN account_kind SET NOT NULL;

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

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS image_front_path TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS image_left_path TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS image_right_path TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS image_back_path TEXT;

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS mileage DOUBLE PRECISION;

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS custom_expirations JSONB NOT NULL DEFAULT '[]'::jsonb;

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

CREATE TABLE IF NOT EXISTS vehicle_handovers (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies (id),
  vehicle_id UUID NOT NULL REFERENCES vehicles (id),
  driver_id UUID REFERENCES principals (id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('out', 'in')),
  status TEXT NOT NULL CHECK (status IN ('open', 'closed', 'voided')),
  handover_out_id UUID REFERENCES vehicle_handovers (id),
  mileage DOUBLE PRECISION NOT NULL,
  mileage_unit TEXT NOT NULL CHECK (mileage_unit IN ('mi', 'km')),
  next_service_days INTEGER NOT NULL CHECK (next_service_days >= 1),
  next_service_distance DOUBLE PRECISION NOT NULL,
  next_service_distance_unit TEXT NOT NULL CHECK (next_service_distance_unit IN ('mi', 'km')),
  damages_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  CONSTRAINT vehicle_handovers_out_shape CHECK (
    type <> 'out' OR (handover_out_id IS NULL)
  ),
  CONSTRAINT vehicle_handovers_in_shape CHECK (
    type <> 'in' OR (handover_out_id IS NOT NULL AND status = 'closed')
  )
);

CREATE INDEX IF NOT EXISTS vehicle_handovers_vehicle_created
  ON vehicle_handovers (vehicle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS vehicle_handovers_company
  ON vehicle_handovers (company_id);
CREATE INDEX IF NOT EXISTS vehicle_handovers_out_fk
  ON vehicle_handovers (handover_out_id);

CREATE UNIQUE INDEX IF NOT EXISTS vehicle_handovers_one_open_out_per_vehicle
  ON vehicle_handovers (vehicle_id)
  WHERE type = 'out' AND status = 'open';

CREATE UNIQUE INDEX IF NOT EXISTS vehicle_handovers_one_open_out_per_driver
  ON vehicle_handovers (driver_id)
  WHERE type = 'out' AND status = 'open' AND driver_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS vehicle_handover_images (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies (id),
  vehicle_id UUID NOT NULL REFERENCES vehicles (id),
  handover_id UUID NOT NULL REFERENCES vehicle_handovers (id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicle_handover_images_handover
  ON vehicle_handover_images (handover_id, sort_order);

CREATE TABLE IF NOT EXISTS driver_daily_usages (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies (id),
  driver_id UUID NOT NULL REFERENCES principals (id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles (id),
  usage_date DATE NOT NULL,
  start_place TEXT NOT NULL,
  end_place TEXT NOT NULL,
  start_distance DOUBLE PRECISION NOT NULL,
  end_distance DOUBLE PRECISION NOT NULL,
  distance_unit TEXT NOT NULL CHECK (distance_unit IN ('mi', 'km')),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT driver_daily_usages_distance_order CHECK (end_distance >= start_distance),
  CONSTRAINT driver_daily_usages_time_order CHECK (end_time >= start_time)
);

CREATE INDEX IF NOT EXISTS driver_daily_usages_driver_created
  ON driver_daily_usages (driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS driver_daily_usages_company
  ON driver_daily_usages (company_id);

