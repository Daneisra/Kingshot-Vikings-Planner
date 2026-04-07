CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname VARCHAR(40) NOT NULL,
  partner_name VARCHAR(40) NOT NULL,
  troop_count INTEGER NOT NULL CHECK (troop_count >= 0),
  troop_level INTEGER NOT NULL CHECK (troop_level >= 1 AND troop_level <= 100),
  comment TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS registrations_set_updated_at ON registrations;

CREATE TRIGGER registrations_set_updated_at
BEFORE UPDATE ON registrations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_registrations_nickname_lower
  ON registrations ((LOWER(nickname)));

CREATE INDEX IF NOT EXISTS idx_registrations_partner_name_lower
  ON registrations ((LOWER(partner_name)));

CREATE INDEX IF NOT EXISTS idx_registrations_is_available
  ON registrations (is_available);

