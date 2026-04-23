import { pool } from "../db/pool";

export async function ensureRegistrationSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS weekly_archives (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      registration_count INTEGER NOT NULL DEFAULT 0,
      total_troops INTEGER NOT NULL DEFAULT 0,
      available_participants INTEGER NOT NULL DEFAULT 0,
      registrations JSONB NOT NULL DEFAULT '[]'::jsonb
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_weekly_archives_archived_at
      ON weekly_archives (archived_at DESC)
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
}
