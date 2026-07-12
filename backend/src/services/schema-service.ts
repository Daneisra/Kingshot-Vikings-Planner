import { pool } from "../db/pool";
import { seedDefaultFormationPresets } from "./formation-service";

export async function ensureRegistrationSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS registrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nickname VARCHAR(40) NOT NULL,
      partner_name VARCHAR(40) NOT NULL,
      partner_names JSONB NOT NULL DEFAULT '[]'::jsonb,
      troop_count INTEGER NOT NULL CHECK (troop_count >= 0),
      troop_level INTEGER NOT NULL CONSTRAINT registrations_troop_level_supported_check
        CHECK (troop_level >= 7 AND troop_level <= 16),
      troop_loadout JSONB NOT NULL DEFAULT '[]'::jsonb,
      personal_score INTEGER CHECK (personal_score IS NULL OR personal_score >= 0),
      comment TEXT,
      is_available BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_registrations_nickname_lower
      ON registrations ((LOWER(nickname)));

    CREATE INDEX IF NOT EXISTS idx_registrations_partner_name_lower
      ON registrations ((LOWER(partner_name)));

    CREATE INDEX IF NOT EXISTS idx_registrations_is_available
      ON registrations (is_available);

    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      checksum VARCHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
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
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_weekly_archives_archived_at
      ON weekly_archives (archived_at DESC)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key VARCHAR(80) PRIMARY KEY,
      value JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_app_settings_updated_at
      ON app_settings (updated_at DESC)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS troop_formation_presets (
      event_key VARCHAR(40) PRIMARY KEY,
      event_name VARCHAR(80) NOT NULL,
      available_troops JSONB NOT NULL DEFAULT '{"infantry":0,"lancer":0,"marksman":0}'::jsonb,
      slots JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_troop_formation_presets_updated_at
      ON troop_formation_presets (updated_at DESC)
  `);

  await pool.query(`
    ALTER TABLE weekly_archives
    ADD COLUMN IF NOT EXISTS alliance_score INTEGER
  `);

  await pool.query(`
    ALTER TABLE weekly_archives
    ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(40)
  `);

  await pool.query(`
    ALTER TABLE weekly_archives
    ADD COLUMN IF NOT EXISTS difficulty_note TEXT
  `);

  await pool.query(`
    ALTER TABLE weekly_archives
    ADD COLUMN IF NOT EXISTS event_log TEXT
  `);

  await pool.query(`
    ALTER TABLE weekly_archives
    ADD COLUMN IF NOT EXISTS manual_stats JSONB NOT NULL DEFAULT '[]'::jsonb
  `);

  await pool.query(`
    UPDATE weekly_archives
    SET manual_stats = '[]'::jsonb
    WHERE manual_stats IS NULL
  `);

  await pool.query(`
    ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS troop_loadout JSONB NOT NULL DEFAULT '[]'::jsonb
  `);

  await pool.query(`
    ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS partner_names JSONB NOT NULL DEFAULT '[]'::jsonb
  `);

  await pool.query(`
    ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS personal_score INTEGER CHECK (personal_score IS NULL OR personal_score >= 0)
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'registrations_troop_level_supported_check'
          AND conrelid = 'registrations'::regclass
      ) THEN
        ALTER TABLE registrations
          ADD CONSTRAINT registrations_troop_level_supported_check
          CHECK (troop_level >= 7 AND troop_level <= 16)
          NOT VALID;
      END IF;
    END;
    $$;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM registrations
        WHERE troop_level < 7 OR troop_level > 16
      ) THEN
        ALTER TABLE registrations
          VALIDATE CONSTRAINT registrations_troop_level_supported_check;
      END IF;
    END;
    $$;
  `);

  await pool.query(`
    UPDATE registrations
    SET troop_loadout = '[]'::jsonb
    WHERE troop_loadout IS NULL
  `);

  await pool.query(`
    UPDATE registrations
    SET partner_names = jsonb_build_array(partner_name)
    WHERE partner_names IS NULL
      OR partner_names = '[]'::jsonb
  `);

  await pool.query(`
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
  `);

  await seedDefaultFormationPresets();
}
