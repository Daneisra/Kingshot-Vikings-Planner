import { pool } from "../db/pool";

export async function ensureRegistrationSchema() {
  await pool.query(`
    ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS troop_loadout JSONB NOT NULL DEFAULT '[]'::jsonb
  `);

  await pool.query(`
    ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS partner_names JSONB NOT NULL DEFAULT '[]'::jsonb
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
