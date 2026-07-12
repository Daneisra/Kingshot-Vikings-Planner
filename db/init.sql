CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname VARCHAR(40) NOT NULL,
  partner_name VARCHAR(40) NOT NULL,
  partner_names JSONB NOT NULL DEFAULT '[]'::jsonb
    CONSTRAINT registrations_partner_names_array_check CHECK (jsonb_typeof(partner_names) = 'array'),
  troop_count INTEGER NOT NULL CHECK (troop_count >= 0),
  troop_level INTEGER NOT NULL CONSTRAINT registrations_troop_level_supported_check
    CHECK (troop_level >= 7 AND troop_level <= 16),
  troop_loadout JSONB NOT NULL DEFAULT '[]'::jsonb
    CONSTRAINT registrations_troop_loadout_array_check CHECK (jsonb_typeof(troop_loadout) = 'array'),
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
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CONSTRAINT audit_logs_metadata_object_check CHECK (jsonb_typeof(metadata) = 'object'),
  request_id UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  checksum VARCHAR(64) NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  manual_stats JSONB NOT NULL DEFAULT '[]'::jsonb
    CONSTRAINT weekly_archives_manual_stats_array_check CHECK (jsonb_typeof(manual_stats) = 'array'),
  registrations JSONB NOT NULL DEFAULT '[]'::jsonb
    CONSTRAINT weekly_archives_registrations_array_check CHECK (jsonb_typeof(registrations) = 'array')
);

CREATE TABLE IF NOT EXISTS app_settings (
  key VARCHAR(80) PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb
    CONSTRAINT app_settings_value_object_check CHECK (jsonb_typeof(value) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS troop_formation_presets (
  event_key VARCHAR(40) PRIMARY KEY,
  event_name VARCHAR(80) NOT NULL,
  available_troops JSONB NOT NULL DEFAULT '{"infantry":0,"lancer":0,"marksman":0}'::jsonb
    CONSTRAINT troop_formation_presets_available_troops_object_check
      CHECK (jsonb_typeof(available_troops) = 'object'),
  slots JSONB NOT NULL DEFAULT '[]'::jsonb
    CONSTRAINT troop_formation_presets_slots_array_check CHECK (jsonb_typeof(slots) = 'array'),
  template_version INTEGER NOT NULL DEFAULT 1 CHECK (template_version >= 1),
  is_customized BOOLEAN NOT NULL DEFAULT FALSE,
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
DROP TRIGGER IF EXISTS app_settings_set_updated_at ON app_settings;
DROP TRIGGER IF EXISTS troop_formation_presets_set_updated_at ON troop_formation_presets;

CREATE TRIGGER registrations_set_updated_at
BEFORE UPDATE ON registrations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER app_settings_set_updated_at
BEFORE UPDATE ON app_settings
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER troop_formation_presets_set_updated_at
BEFORE UPDATE ON troop_formation_presets
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

CREATE INDEX IF NOT EXISTS idx_app_settings_updated_at
  ON app_settings (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_troop_formation_presets_updated_at
  ON troop_formation_presets (updated_at DESC);
