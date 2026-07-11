import { createHash } from "crypto";
import { readdir, readFile } from "fs/promises";
import path from "path";
import type { PoolClient } from "pg";
import { pool } from "../db/pool";

const migrationsDirectory = path.resolve(__dirname, "../../../db/migrations");
const migrationLockName = "kingshot-vikings-planner:migrations";

interface AppliedMigrationRow {
  name: string;
  checksum: string;
}

async function ensureMigrationTable(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      checksum VARCHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function listMigrationFiles() {
  const entries = await readdir(migrationsDirectory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "en"));
}

function checksum(contents: string) {
  return createHash("sha256").update(contents.replace(/\r\n/g, "\n"), "utf8").digest("hex");
}

async function runMigration(client: PoolClient, name: string, sql: string, migrationChecksum: string) {
  await client.query("BEGIN");

  try {
    await client.query(sql);
    await client.query(
      `
        INSERT INTO schema_migrations (name, checksum)
        VALUES ($1, $2)
      `,
      [name, migrationChecksum]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query("SELECT pg_advisory_lock(hashtext($1::text))", [migrationLockName]);
    await ensureMigrationTable(client);

    const appliedResult = await client.query<AppliedMigrationRow>(
      "SELECT name, checksum FROM schema_migrations ORDER BY name"
    );
    const appliedMigrations = new Map(appliedResult.rows.map((row) => [row.name, row.checksum]));
    const migrationFiles = await listMigrationFiles();
    let appliedCount = 0;

    for (const name of migrationFiles) {
      const sql = await readFile(path.join(migrationsDirectory, name), "utf8");
      const migrationChecksum = checksum(sql);
      const appliedChecksum = appliedMigrations.get(name);

      if (appliedChecksum) {
        if (appliedChecksum !== migrationChecksum) {
          throw new Error(`Applied migration checksum mismatch: ${name}`);
        }

        console.log(`[migrate] Already applied: ${name}`);
        continue;
      }

      console.log(`[migrate] Applying: ${name}`);
      await runMigration(client, name, sql, migrationChecksum);
      appliedCount += 1;
    }

    console.log(`[migrate] Complete: ${appliedCount} migration(s) applied`);
  } finally {
    await client
      .query("SELECT pg_advisory_unlock(hashtext($1::text))", [migrationLockName])
      .catch(() => undefined);
    client.release();
  }
}

async function main() {
  try {
    await migrate();
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("[migrate] Failed", error);
  process.exitCode = 1;
});
