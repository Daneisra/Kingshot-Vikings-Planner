CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname VARCHAR(40) NOT NULL,
  partner_name VARCHAR(40) NOT NULL,
  partner_names JSONB NOT NULL DEFAULT '[]'::jsonb,
  troop_count INTEGER NOT NULL CHECK (troop_count >= 0),
  troop_level INTEGER NOT NULL CHECK (troop_level >= 7 AND troop_level <= 100),
  troop_loadout JSONB NOT NULL DEFAULT '[]'::jsonb,
  personal_score INTEGER CHECK (personal_score IS NULL OR personal_score >= 0),
  comment TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(50) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id UUID,
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  request_id UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weekly_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  registration_count INTEGER NOT NULL DEFAULT 0,
  total_troops INTEGER NOT NULL DEFAULT 0,
  available_participants INTEGER NOT NULL DEFAULT 0,
  alliance_score INTEGER,
  difficulty_level VARCHAR(40),
  difficulty_note TEXT,
  event_log TEXT,
  registrations JSONB NOT NULL DEFAULT '[]'::jsonb
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

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created_at
  ON audit_logs (action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_archives_archived_at
  ON weekly_archives (archived_at DESC);
