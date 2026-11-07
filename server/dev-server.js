// Local API server for development. It mounts the SAME files in /api that Vercel deploys,
// using Vercel's file-based routing rules, so nothing changes at deploy time.
//   api/stats.js                  -> /api/stats
//   api/requests/index.js         -> /api/requests
//   api/requests/[id].js          -> /api/requests/:id
//   api/requests/[id]/[action].js -> /api/requests/:id/:action
import express from 'express';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
try {
  process.loadEnvFile(join(root, '.env'));
} catch {
  /* .env missing: ensure-env.js already explained what to do */
}

const PORT = Number(process.env.API_PORT || 3001);
const apiDir = join(root, 'api');

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : f.endsWith('.js') ? [p] : [];
  });
}

const routes = walk(apiDir).map((file) => {
  const segs = relative(apiDir, file).split(sep);
  segs[segs.length - 1] = segs.at(-1).replace(/\.js$/, '');
  if (segs.at(-1) === 'index') segs.pop();
  const path = '/api/' + segs.map((s) => (/^\[.+\]$/.test(s) ? ':' + s.slice(1, -1) : s)).join('/');
  const dynamic = segs.filter((s) => s.startsWith('[')).length;
  return { file, path: path.replace(/\/$/, '') || '/api', dynamic, depth: segs.length };
});
// Static routes win over dynamic ones, like on Vercel
routes.sort((a, b) => a.dynamic - b.dynamic || b.depth - a.depth);

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

for (const r of routes) {
  const mod = await import(pathToFileURL(r.file).href);
  app.all(r.path, async (req, res) => {
    // Vercel exposes route params through req.query, so mirror that here
    Object.defineProperty(req, 'query', { value: { ...req.query, ...req.params }, writable: true, configurable: true, enumerable: true });
    try {
      await mod.default(req, res);
    } catch (e) {
      console.error(e);
      if (!res.headersSent) res.status(500).json({ error: 'Unexpected server error' });
    }
  });
}

app.use('/api', (req, res) => res.status(404).json({ error: `No API route for ${req.method} ${req.originalUrl}` }));

app.listen(PORT, () => {
  console.log(`API ready on http://localhost:${PORT}  (${routes.length} route files)`);
  for (const r of routes) console.log(`  ${r.path.padEnd(32)} ${relative(root, r.file)}`);
});
