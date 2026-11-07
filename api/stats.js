// GET /api/stats: public landing-page counters. Aggregates only, never individual requests.
import { query } from '../lib/db.js';
import { route } from '../lib/http.js';
import { loadRequests, loadLimits, verdictOf } from '../lib/requests.js';

export default route({
  GET: async (req, res) => {
    const [[month], [active], certified, limits] = await Promise.all([
      query("SELECT COALESCE(SUM(num_samples), 0)::int AS n FROM requests WHERE status = 'certified' AND status_at >= date_trunc('month', now())"),
      query("SELECT COUNT(*)::int AS n FROM requests WHERE status <> 'certified'"),
      loadRequests("status = 'certified'"),
      loadLimits(),
    ]);
    const tats = certified.map((r) => (new Date(r.statusAt) - new Date(r.createdAt)) / 3600e3);
    const onSpec = certified.filter((r) => verdictOf(r, limits).onSpec).length;
    res.json({
      samplesThisMonth: month.n,
      avgTurnaroundHours: tats.length ? tats.reduce((a, b) => a + b, 0) / tats.length : 0,
      onSpecRate: certified.length ? (onSpec / certified.length) * 100 : 0,
      activeRequests: active.n,
      certifiedTotal: certified.length,
    });
  },
});
