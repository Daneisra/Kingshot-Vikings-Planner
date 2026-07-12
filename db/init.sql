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
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
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
  manual_stats JSONB NOT NULL DEFAULT '[]'::jsonb,
  registrations JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS app_settings (
  key VARCHAR(80) PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS troop_formation_presets (
  event_key VARCHAR(40) PRIMARY KEY,
  event_name VARCHAR(80) NOT NULL,
  available_troops JSONB NOT NULL DEFAULT '{"infantry":0,"lancer":0,"marksman":0}'::jsonb,
  slots JSONB NOT NULL DEFAULT '[]'::jsonb,
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

INSERT INTO troop_formation_presets (event_key, event_name, available_troops, slots)
VALUES
  (
    'bear-trap',
    'Bear Trap',
    '{"infantry":0,"lancer":0,"marksman":0}'::jsonb,
    '[
      {"id":"bear-b1","name":"B1","hero":"Marlin/Zoe/Amadeus","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":1},
      {"id":"bear-j1","name":"J1","hero":"Amane","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":2},
      {"id":"bear-j2","name":"J2","hero":"Chenko","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":3},
      {"id":"bear-j3","name":"J3","hero":"Yeonwoo","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":4},
      {"id":"bear-j4","name":"J4","hero":"No hero","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":5},
      {"id":"bear-j5","name":"J5","hero":"No hero","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":6}
    ]'::jsonb
  ),
  (
    'vikings',
    'Vikings',
    '{"infantry":0,"lancer":0,"marksman":0}'::jsonb,
    '[
      {"id":"vikings-garrison-lead","name":"Garrison Lead","hero":"Marlin/Zoe/Jabel","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":1},
      {"id":"vikings-garrison-join","name":"Garrison Join","hero":"Amane","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":2},
      {"id":"vikings-j1","name":"J1","hero":"Amane","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":3},
      {"id":"vikings-j2","name":"J2","hero":"Yeonwoo","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":4},
      {"id":"vikings-j3","name":"J3","hero":"Chenko","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":5},
      {"id":"vikings-j4","name":"J4","hero":"Gordon","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":6},
      {"id":"vikings-j5","name":"J5","hero":"Howard","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":7},
      {"id":"vikings-j6","name":"J6","hero":"Amadeus","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":8}
    ]'::jsonb
  ),
  (
    'battle',
    'Battle',
    '{"infantry":0,"lancer":0,"marksman":0}'::jsonb,
    '[
      {"id":"battle-a1","name":"A1","hero":"Amane","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":1},
      {"id":"battle-a2","name":"A2","hero":"Yeonwoo","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":2},
      {"id":"battle-d1","name":"D1","hero":"Gordon","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":3},
      {"id":"battle-d2","name":"D2","hero":"Howard","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":4},
      {"id":"battle-d3","name":"D3","hero":"Saul","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":5}
    ]'::jsonb
  )
ON CONFLICT (event_key) DO NOTHING;
