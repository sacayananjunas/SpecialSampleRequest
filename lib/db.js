// Database access for the /api functions. Server-side only; the connection string never reaches the browser.
//
// DATABASE_URL=postgresql://...neon.tech/...   -> Neon serverless driver (HTTP), used locally and on Vercel
// DATABASE_URL=pglite:./.data/pglite           -> optional embedded Postgres for offline testing (dev only)
import { neon } from '@neondatabase/serverless';
import { HttpError } from './http.js';

let impl;

const UNREACHABLE = /fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|connect|socket|network|password authentication failed|getaddrinfo|endpoint .* (could not|does not)/i;

function dbError(e) {
  if (e instanceof HttpError) return e;
  if (e?.code === '23505') return new HttpError(409, 'That record already exists.', 'CONFLICT');
  if (e?.code === '23503') return new HttpError(400, 'A referenced record does not exist.', 'BAD_REFERENCE');
  if (e?.code === '23514' || e?.code === '22P02') return new HttpError(400, 'Some values are not allowed. Please check the form.', 'BAD_VALUE');
  if (UNREACHABLE.test(e?.message || '') || UNREACHABLE.test(e?.sourceError?.message || '')) {
    console.error('[db] unreachable:', e?.message);
    return new HttpError(503, "We can't reach the database right now. Check your internet connection and DATABASE_URL, then try again.", 'DB_UNAVAILABLE');
  }
  return e;
}

async function getImpl() {
  if (impl) return impl;
  const url = process.env.DATABASE_URL;
  if (!url) throw new HttpError(503, 'The database is not configured yet (DATABASE_URL is empty).', 'DB_UNAVAILABLE');
  if (url.startsWith('pglite:')) {
    // Dev-only embedded Postgres. It runs inside this one process, so a leftover lock file is always stale,
    // and we CHECKPOINT after writes so a hard stop (Ctrl+C, node --watch restart) can't lose data.
    const dir = url.slice('pglite:'.length);
    const { rmSync } = await import('node:fs');
    rmSync(`${dir}/postmaster.pid`, { force: true });
    const { PGlite } = await import('@electric-sql/pglite');
    const db = new PGlite(dir);
    const flush = () => db.exec('CHECKPOINT');
    impl = {
      query: async (text, params = []) => {
        const rows = (await db.query(text, params)).rows;
        if (!/^\s*select/i.test(text)) await flush();
        return rows;
      },
      transaction: async (qs) => {
        const out = await db.transaction(async (tx) => {
          const res = [];
          for (const x of qs) res.push((await tx.query(x.text, x.params ?? [])).rows);
          return res;
        });
        await flush();
        return out;
      },
    };
  } else {
    const sql = neon(url);
    impl = {
      query: (text, params = []) => sql.query(text, params),
      transaction: (qs) => sql.transaction(qs.map((x) => sql.query(x.text, x.params ?? []))),
    };
  }
  return impl;
}

/** Run one parameterised statement, returns rows. */
export async function query(text, params = []) {
  try {
    return await (await getImpl()).query(text, params);
  } catch (e) {
    throw dbError(e);
  }
}

/** Run several statements atomically: tx([{ text, params }, ...]) -> array of row arrays. */
export async function tx(statements) {
  try {
    return await (await getImpl()).transaction(statements);
  } catch (e) {
    throw dbError(e);
  }
}

export const iso = (d) => (d ? new Date(d).toISOString() : null);
