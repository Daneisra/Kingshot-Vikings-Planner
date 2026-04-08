import { pool } from "../db/pool";

export async function ensureRegistrationSchema() {
  await pool.query(`
    ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS troop_loadout JSONB NOT NULL DEFAULT '[]'::jsonb
  `);

  await pool.query(`
    UPDATE registrations
    SET troop_loadout = '[]'::jsonb
    WHERE troop_loadout IS NULL
  `);
}
