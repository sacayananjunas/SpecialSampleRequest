// npm run db:setup -> runs db/schema.sql then db/seed.sql, and prints row counts.
// Safe to run again: the schema uses IF NOT EXISTS and the seed uses ON CONFLICT DO NOTHING.
import { readFileSync } from 'node:fs';
import { Pool, neonConfig } from '@neondatabase/serverless';

process.loadEnvFile(new URL('../.env', import.meta.url));
const url = process.env.DATABASE_URL;
const read = (f) => readFileSync(new URL(`../db/${f}`, import.meta.url), 'utf8');
const schema = read('schema.sql');
const seed = read('seed.sql');

const COUNTS = ['users', 'process_units', 'tests', 'specs', 'spec_limits', 'packages', 'instruments', 'requests', 'request_tests', 'results', 'custody_events', 'comments', 'property_readings'];

async function run(exec, queryRows) {
  console.log('→ Creating tables (db/schema.sql)…');
  await exec(schema);
  console.log('→ Loading sample data (db/seed.sql)…');
  await exec(seed);
  const rows = [];
  for (const t of COUNTS) rows.push({ table: t, rows: Number((await queryRows(`SELECT COUNT(*)::int AS n FROM ${t}`))[0].n) });
  console.log('\n✔ Database ready. Row counts:');
  console.table(rows);
}

try {
  if (url.startsWith('pglite:')) {
    const { PGlite } = await import('@electric-sql/pglite');
    const dir = url.slice('pglite:'.length);
    const { mkdirSync, rmSync } = await import('node:fs');
    mkdirSync(dir, { recursive: true });
    rmSync(`${dir}/postmaster.pid`, { force: true });
    const db = new PGlite(dir);
    await run((sql) => db.exec(sql), async (sql) => (await db.query(sql)).rows);
    await db.close();
  } else {
    neonConfig.webSocketConstructor = globalThis.WebSocket; // Node 22+ has a built-in WebSocket
    const pool = new Pool({ connectionString: url });
    const client = await pool.connect();
    try {
      await run((sql) => client.query(sql), async (sql) => (await client.query(sql)).rows);
    } finally {
      client.release();
      await pool.end();
    }
  }
} catch (e) {
  console.error(`\n✖ Database setup failed: ${e.message}`);
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|password|connect|WebSocket/i.test(e.message)) {
    console.error('  Check that DATABASE_URL in .env is the full Neon connection string and that you are online.');
  }
  process.exit(1);
}
