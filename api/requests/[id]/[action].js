// POST /api/requests/:id/status | results | comments | issues | retest
// Every action re-checks permissions server-side and returns the updated request.
import { query, tx } from '../../../lib/db.js';
import { route, body, bad, notFound, HttpError } from '../../../lib/http.js';
import { requireUser, isLab } from '../../../lib/auth.js';
import { getFor, loadLimits, verdictOf } from '../../../lib/requests.js';
import { statusIndex, statusLabel, ISSUE_TYPES, evaluate, estimateFrom, dueAtFrom } from '../../../shared/rules.js';

const forbid = (msg) => new HttpError(403, msg, 'FORBIDDEN');
const roleLabel = (u) => ({ requester: 'Requester', analyst: 'Lab Analyst', supervisor: 'Lab Supervisor' })[u.role];
const custody = (id, user, action, note = null) => ({
  text: 'INSERT INTO custody_events (request_id, by_name, by_role, action, note) VALUES ($1, $2, $3, $4, $5)',
  params: [id, user.name, roleLabel(user), action, note],
});

async function status(user, req, d) {
  if (!isLab(user)) throw forbid('Only lab staff can change the status of a sample.');
  const to = String(d.status || '');
  if (statusIndex(to) < 0) throw bad('Unknown status.');
  if (to === req.status) return;
  const vd = verdictOf(req, await loadLimits());
  if (to === 'certified' && user.role !== 'supervisor') throw forbid('Only a Lab Supervisor can certify and release results.');
  if (statusIndex(to) >= 3 && !vd.complete) throw bad(`${vd.total - vd.entered} result(s) are still missing. Enter all results first.`, 'RESULTS_MISSING');
  if (statusIndex(to) >= 2 && statusIndex(req.status) < 1) throw bad('Receive the sample first: chain of custody requires it before analysis.', 'NOT_RECEIVED');
  const back = statusIndex(to) < statusIndex(req.status);
  const note = String(d.note || (to === 'certified' ? 'CoA issued' : back ? 'Moved back' : '')).slice(0, 300) || null;
  await tx([
    { text: 'UPDATE requests SET status = $2, status_at = now() WHERE id = $1', params: [req.id, to] },
    custody(req.id, user, `Status → ${statusLabel(to)}`, note),
  ]);
}

async function results(user, req, d) {
  if (!isLab(user)) throw forbid('Only lab staff can enter results.');
  if (req.status === 'certified') throw bad('Results are certified and locked. Request a retest to re-run a parameter.');
  if (statusIndex(req.status) < 1) throw bad('Mark the sample as received before entering results.');
  const values = d.values && typeof d.values === 'object' ? d.values : {};
  const entries = Object.entries(values).filter(([, v]) => v !== '' && v !== null && v !== undefined);
  if (!entries.length) throw bad('Enter at least one result.');
  const tests = await query('SELECT id, method, unit, range_min, range_max, decimals FROM tests WHERE id = ANY($1::text[])', [entries.map(([k]) => k)]);
  const stmts = [];
  for (const [tid, raw] of entries) {
    const t = tests.find((x) => x.id === tid);
    if (!t || !req.tests.includes(tid)) throw bad(`${tid} is not part of this request.`);
    const v = Number(raw);
    if (!Number.isFinite(v)) throw bad(`Result for ${t.method} must be a number.`);
    if (v < t.range_min || v > t.range_max) throw bad(`${t.method} result ${v} is outside the method range (${t.range_min}–${t.range_max} ${t.unit}).`, 'OUT_OF_RANGE');
    stmts.push({
      text: `INSERT INTO results (request_id, test_id, value, entered_by, entered_by_name, entered_at) VALUES ($1, $2, $3, $4, $5, now())
             ON CONFLICT (request_id, test_id) DO UPDATE SET value = EXCLUDED.value, entered_by = EXCLUDED.entered_by, entered_by_name = EXCLUDED.entered_by_name, entered_at = now()`,
      params: [req.id, tid, v, user.id, user.name],
    });
  }
  stmts.push(custody(req.id, user, 'Results entered', `${entries.length} parameter(s)`));
  await tx(stmts);
}

async function comments(user, req, d) {
  const text = String(d.text || '').trim();
  if (text.length < 2) throw bad('Write a short message before sending.');
  if (text.length > 2000) throw bad('Keep comments under 2000 characters.');
  await query('INSERT INTO comments (request_id, user_id, by_name, by_role, body) VALUES ($1, $2, $3, $4, $5)', [req.id, user.id, user.name, isLab(user) ? 'Lab' : 'Requester', text]);
}

async function issues(user, req, d) {
  if (!isLab(user)) throw forbid('Only lab staff can flag sample issues.');
  if (!ISSUE_TYPES.includes(d.type)) throw bad('Choose what is wrong with the sample.');
  const note = String(d.note || '').trim().slice(0, 300);
  await tx([
    { text: 'INSERT INTO issues (request_id, type, note, by_name) VALUES ($1, $2, $3, $4)', params: [req.id, d.type, note || null, user.name] },
    custody(req.id, user, `Issue flagged: ${d.type}`, note || 'Requester notified'),
  ]);
}

async function retest(user, req) {
  if (statusIndex(req.status) < 3) throw bad('A retest can be requested once results are in QC review or certified.');
  const limits = await loadLimits();
  const failed = req.tests.filter((t) => ['FAIL', 'OFF-SPEC'].includes(evaluate(req.results[t]?.value ?? null, limits[req.spec]?.[t])));
  const testIds = failed.length ? failed : req.tests;
  const priority = req.priority === 'Routine' ? 'Urgent' : req.priority;
  const tests = await query('SELECT id, price, tat_hours FROM tests WHERE id = ANY($1::text[])', [testIds]);
  const { maxTat } = estimateFrom(tests.map((t) => ({ price: t.price, tat: t.tat_hours })), 1, priority);
  const [{ n }] = await query("SELECT nextval('request_seq')::int AS n");
  const id = `PS-2026-${String(n).padStart(5, '0')}`;
  const now = new Date().toISOString();
  await tx([
    {
      text: `INSERT INTO requests (id, requester_id, requester_name, department, created_at, site, unit_id, sampling_point, batch, cost_center, product, num_samples, sampled_at, sampled_by, volume, container, package_id, package_name, purpose, spec_id, flam_class, h2s, h2s_ppm, pressurized, norm, storage, retain, instructions, priority, attachments, status, status_at, due_at, retest_of)
             SELECT $2, requester_id, requester_name, department, $3, site, unit_id, sampling_point, batch, cost_center, product, num_samples, sampled_at, sampled_by, volume, container, NULL, $4, purpose, spec_id, flam_class, h2s, h2s_ppm, pressurized, norm, storage, retain, instructions, $5, attachments, 'submitted', $3, $6, id
             FROM requests WHERE id = $1`,
      params: [req.id, id, now, `Retest of ${req.id}`, priority, dueAtFrom(now, maxTat, priority)],
    },
    ...testIds.map((t, k) => ({ text: 'INSERT INTO request_tests (request_id, test_id, order_index) VALUES ($1, $2, $3)', params: [id, t, k] })),
    custody(id, user, 'Request submitted', `Retest of ${req.id} using retain sample`),
    {
      text: 'INSERT INTO comments (request_id, user_id, by_name, by_role, body) VALUES ($1, $2, $3, $4, $5)',
      params: [id, user.id, user.name, isLab(user) ? 'Lab' : 'Requester', `Retest requested for ${testIds.length} parameter(s) from ${req.id}. Please use the retain sample.`],
    },
    custody(req.id, user, 'Retest requested', `New request ${id}`),
  ]);
  return id;
}

const ACTIONS = { status, results, comments, issues, retest };

export default route({
  POST: async (req, res) => {
    const fn = ACTIONS[req.query.action];
    if (!fn) throw notFound();
    const user = await requireUser(req);
    const request = await getFor(user, req.query.id); // 404 if not theirs
    const newId = await fn(user, request, body(req));
    res.json({ request: await getFor(user, newId ?? request.id) });
  },
});
