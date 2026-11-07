// GET /api/instruments, PATCH /api/instruments { id, status }  (lab staff only)
import { query } from '../lib/db.js';
import { route, body, bad, notFound } from '../lib/http.js';
import { requireUser, LAB_ROLES } from '../lib/auth.js';
import { INSTRUMENT_STATES } from '../shared/rules.js';

const DETAIL = { Online: 'Ready', 'In Use': 'Run started just now', 'Calibration Due': 'Calibration check scheduled', Down: 'Marked down by lab' };
const list = () => query('SELECT id, name, model, status, detail FROM instruments ORDER BY sort_order');

export default route({
  GET: async (req, res) => {
    await requireUser(req, LAB_ROLES);
    res.json({ instruments: await list() });
  },
  PATCH: async (req, res) => {
    const user = await requireUser(req, LAB_ROLES);
    const { id, status } = body(req);
    if (!INSTRUMENT_STATES.includes(status)) throw bad('Unknown instrument status.');
    const rows = await query('UPDATE instruments SET status = $2, detail = $3, updated_at = now() WHERE id = $1 RETURNING id', [id, status, `${DETAIL[status]} · ${user.name}`]);
    if (!rows.length) throw notFound('Instrument not found.');
    res.json({ instruments: await list() });
  },
});
