// Load sample requests with their tests, results, custody log, comments and issues,
// shaped exactly like the objects the React app renders.
import { query, iso } from './db.js';
import { notFound } from './http.js';
import { isLab } from './auth.js';
import { summarize } from '../shared/rules.js';

const byRequest = (rows) => {
  const m = new Map();
  for (const r of rows) {
    if (!m.has(r.request_id)) m.set(r.request_id, []);
    m.get(r.request_id).push(r);
  }
  return m;
};

function shape(r, rel) {
  const results = {};
  for (const x of rel.results.get(r.id) ?? []) results[x.test_id] = { value: Number(x.value), by: x.entered_by_name, at: iso(x.entered_at) };
  return {
    id: r.id,
    requesterId: r.requester_id,
    createdAt: iso(r.created_at),
    requester: { name: r.requester_name, dept: r.department },
    site: r.site,
    unit: r.unit_id,
    point: r.sampling_point,
    batch: r.batch || '—',
    costCenter: r.cost_center,
    product: r.product,
    numSamples: r.num_samples,
    sampledAt: iso(r.sampled_at),
    sampledBy: r.sampled_by,
    volume: r.volume,
    container: r.container,
    packageId: r.package_id,
    packageName: r.package_name,
    tests: (rel.tests.get(r.id) ?? []).map((t) => t.test_id),
    purpose: r.purpose,
    spec: r.spec_id,
    flamClass: r.flam_class,
    h2s: r.h2s,
    h2sPpm: r.h2s_ppm ?? '',
    pressurized: r.pressurized,
    norm: r.norm,
    storage: r.storage,
    retain: r.retain,
    instructions: r.instructions || '',
    priority: r.priority,
    attachments: Array.isArray(r.attachments) ? r.attachments : JSON.parse(r.attachments || '[]'),
    status: r.status,
    statusAt: iso(r.status_at),
    dueAt: iso(r.due_at),
    custody: (rel.custody.get(r.id) ?? []).map((c) => ({ at: iso(c.at), by: c.by_name, role: c.by_role, action: c.action, note: c.note || '' })),
    comments: (rel.comments.get(r.id) ?? []).map((c) => ({ id: c.id, at: iso(c.at), by: c.by_name, role: c.by_role, text: c.body, userId: c.user_id })),
    results,
    issues: (rel.issues.get(r.id) ?? []).map((x) => ({ type: x.type, note: x.note || '', by: x.by_name, at: iso(x.at) })),
    retestOf: r.retest_of,
  };
}

/** where: SQL condition on table alias-free `requests`, params: its parameters */
export async function loadRequests(where = 'TRUE', params = []) {
  const rows = await query(`SELECT * FROM requests WHERE ${where} ORDER BY created_at DESC`, params);
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [tests, results, custody, comments, issues] = await Promise.all([
    query('SELECT request_id, test_id FROM request_tests WHERE request_id = ANY($1::text[]) ORDER BY order_index', [ids]),
    query('SELECT request_id, test_id, value, entered_by_name, entered_at FROM results WHERE request_id = ANY($1::text[])', [ids]),
    query('SELECT * FROM custody_events WHERE request_id = ANY($1::text[]) ORDER BY at, id', [ids]),
    query('SELECT * FROM comments WHERE request_id = ANY($1::text[]) ORDER BY at, id', [ids]),
    query('SELECT * FROM issues WHERE request_id = ANY($1::text[]) ORDER BY at, id', [ids]),
  ]);
  const rel = { tests: byRequest(tests), results: byRequest(results), custody: byRequest(custody), comments: byRequest(comments), issues: byRequest(issues) };
  return rows.map((r) => shape(r, rel));
}

/** Requesters only ever see their own requests; lab staff see all. */
export function listFor(user) {
  return isLab(user) ? loadRequests() : loadRequests('requester_id = $1', [user.id]);
}

/** A single request the user may access; 404 (not 403) so other people's IDs aren't revealed. */
export async function getFor(user, id) {
  const [r] = await loadRequests('id = $1', [String(id)]);
  if (!r || (!isLab(user) && r.requesterId !== user.id)) throw notFound(`We couldn't find request ${id}.`);
  return r;
}

/** Spec limits as { specId: { testId: { min, max } } } */
export async function loadLimits() {
  const rows = await query('SELECT spec_id, test_id, min_value, max_value FROM spec_limits');
  const out = {};
  for (const l of rows) {
    out[l.spec_id] ??= {};
    out[l.spec_id][l.test_id] = { ...(l.min_value !== null && { min: l.min_value }), ...(l.max_value !== null && { max: l.max_value }) };
  }
  return out;
}

export const verdictOf = (req, limits) => summarize(req.tests, req.results, limits[req.spec]);
