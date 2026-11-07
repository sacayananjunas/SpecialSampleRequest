// GET /api/requests  -> requests the user may see (requesters: only their own)
// POST /api/requests -> submit a new Special Sample Lab Analysis Request
import { query, tx } from '../../lib/db.js';
import { route, body, bad } from '../../lib/http.js';
import { requireUser } from '../../lib/auth.js';
import { listFor, getFor } from '../../lib/requests.js';
import { newRequestSchema, parse } from '../../lib/validation.js';
import { estimateFrom, dueAtFrom } from '../../shared/rules.js';

export default route({
  GET: async (req, res) => {
    const user = await requireUser(req);
    res.json({ requests: await listFor(user) });
  },

  POST: async (req, res) => {
    const user = await requireUser(req);
    const d = parse(newRequestSchema, body(req));

    const testIds = [...new Set(d.tests)];
    const [tests, units, specs, pkgRows] = await Promise.all([
      query('SELECT id, price, tat_hours FROM tests WHERE id = ANY($1::text[])', [testIds]),
      query('SELECT id FROM process_units WHERE id = $1', [d.unit]),
      query('SELECT id FROM specs WHERE id = $1', [d.spec]),
      d.packageId ? query('SELECT p.id, p.name, array_agg(pt.test_id) AS tests FROM packages p JOIN package_tests pt ON pt.package_id = p.id WHERE p.id = $1 GROUP BY p.id', [d.packageId]) : [],
    ]);
    if (tests.length !== testIds.length) throw bad('One or more selected tests are not in the catalog.');
    if (!units.length) throw bad('Unknown process unit.');
    if (!specs.length) throw bad('Unknown specification.');

    const pkg = pkgRows[0];
    const isPkg = pkg && pkg.tests.length === testIds.length && pkg.tests.every((t) => testIds.includes(t));
    const packageName = isPkg ? pkg.name : pkg ? `Custom (based on ${pkg.name})` : `Custom – ${testIds.length} tests`;

    const now = new Date().toISOString();
    const { maxTat } = estimateFrom(tests.map((t) => ({ price: t.price, tat: t.tat_hours })), d.numSamples, d.priority);
    const [{ n }] = await query("SELECT nextval('request_seq')::int AS n");
    const id = `PS-2026-${String(n).padStart(5, '0')}`;

    const stmts = [
      {
        text: `INSERT INTO requests (id, requester_id, requester_name, department, created_at, site, unit_id, sampling_point, batch, cost_center, product, num_samples, sampled_at, sampled_by, volume, container, package_id, package_name, purpose, spec_id, flam_class, h2s, h2s_ppm, pressurized, norm, storage, retain, instructions, priority, attachments, status, status_at, due_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30::jsonb,'submitted',$5,$31)`,
        params: [
          id, user.id, d.requesterName, d.dept, now, d.site, d.unit, d.point, d.batch || null, d.costCenter, d.product, d.numSamples,
          new Date(d.sampledAt).toISOString(), d.sampledBy, d.volume, d.container, isPkg ? pkg.id : null, packageName, d.purpose, d.spec,
          d.flamClass, d.h2s, d.h2s ? Number(d.h2sPpm) : null, d.pressurized, d.norm, d.storage, d.retain, d.instructions || null, d.priority,
          JSON.stringify(d.attachments), dueAtFrom(now, maxTat, d.priority),
        ],
      },
      ...testIds.map((t, k) => ({ text: 'INSERT INTO request_tests (request_id, test_id, order_index) VALUES ($1, $2, $3)', params: [id, t, k] })),
      {
        text: 'INSERT INTO custody_events (request_id, at, by_name, by_role, action, note) VALUES ($1, $2, $3, $4, $5, $6)',
        params: [id, now, d.requesterName, 'Requester', 'Request submitted', `Sampled at ${d.point} by ${d.sampledBy}`],
      },
    ];
    if (d.instructions) {
      stmts.push({ text: "INSERT INTO comments (request_id, user_id, by_name, by_role, body, at) VALUES ($1, $2, $3, 'Requester', $4, $5)", params: [id, user.id, d.requesterName, d.instructions, now] });
    }
    await tx(stmts);
    res.status(201).json({ request: await getFor(user, id) });
  },
});
