/**
 * Applies hand-written triggers (0001_triggers.sql) that drizzle-kit doesn't
 * model. Idempotent (CREATE OR REPLACE / DROP TRIGGER IF EXISTS). Run after
 * `drizzle-kit migrate`. See package.json `db:setup`.
 *
 * Requires DATABASE_URL in the environment.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  const here = dirname(fileURLToPath(import.meta.url));
  const sql = readFileSync(join(here, 'migrations', '0001_triggers.sql'), 'utf8');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(sql);
    console.log('Triggers applied.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
