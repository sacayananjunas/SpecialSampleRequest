// GET /api/dashboard?series=hdt-s  (lab staff only): supervisor KPIs, chart data and the property trend.
import { query } from '../lib/db.js';
import { route } from '../lib/http.js';
import { requireUser, LAB_ROLES } from '../lib/auth.js';
import { loadRequests, loadLimits, verdictOf } from '../lib/requests.js';
import { PRODUCTS } from '../shared/rules.js';

const DAY = 86400e3;
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const pct = (cur, prev) => (prev ? Math.round(((cur - prev) / prev) * 100) : undefined);
const tat = (r) => (new Date(r.statusAt) - new Date(r.createdAt)) / 3600e3;

export default route({
  GET: async (req, res) => {
    await requireUser(req, LAB_ROLES);
    const [all, limits, units, testRows, instruments, series] = await Promise.all([
      loadRequests(),
      loadLimits(),
      query('SELECT id, name FROM process_units ORDER BY sort_order'),
      query('SELECT id, method FROM tests'),
      query('SELECT status FROM instruments'),
      query('SELECT * FROM trend_series ORDER BY sort_order'),
    ]);
    const now = Date.now();
    const within = (iso, from, to = 0) => now - new Date(iso) < from * DAY && now - new Date(iso) >= to * DAY;
    const vd = new Map(all.map((r) => [r.id, verdictOf(r, limits)]));

    const thisWeek = all.filter((r) => within(r.createdAt, 7));
    const lastWeek = all.filter((r) => within(r.createdAt, 14, 7));
    const certified = all.filter((r) => r.status === 'certified');
    const certThis = certified.filter((r) => within(r.statusAt, 7));
    const certLast = certified.filter((r) => within(r.statusAt, 14, 7));
    const done = all.filter((r) => vd.get(r.id).complete);
    const offRate = (list) => (list.length ? (list.filter((r) => vd.get(r.id).failed > 0).length / list.length) * 100 : 0);
    const active = all.filter((r) => r.status !== 'certified');
    const overdue = active.filter((r) => new Date(r.dueAt) < now);

    // Requests by product: top 5 + Other
    const byProd = {};
    all.forEach((r) => (byProd[r.product] = (byProd[r.product] || 0) + 1));
    const sorted = Object.entries(byProd).sort((a, b) => b[1] - a[1]);
    const byProduct = sorted.slice(0, 5).map(([k, v]) => ({ name: PRODUCTS.find((p) => p.id === k)?.name ?? k, value: v }));
    const rest = sorted.slice(5).reduce((s, [, v]) => s + v, 0);
    if (rest) byProduct.push({ name: 'Other', value: rest, other: true });

    // Workload: pending tests in the active queue by method
    const methodOf = Object.fromEntries(testRows.map((t) => [t.id, t.method.replace('ASTM ', '')]));
    const wl = {};
    active.forEach((r) => r.tests.forEach((t) => { if (!r.results[t]) wl[methodOf[t]] = (wl[methodOf[t]] || 0) + 1; }));
    const workload = Object.entries(wl).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([method, n]) => ({ method, n }));

    // Turnaround trend: average TAT of requests certified in each of the last 8 weeks
    const tatTrend = Array.from({ length: 8 }, (_, i) => {
      const from = (8 - i) * 7;
      const list = certified.filter((r) => within(r.statusAt, from, from - 7));
      const end = new Date(now - (from - 7) * DAY);
      const v = avg(list.map(tat));
      return { week: end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), hours: v === null ? null : Math.round(v * 10) / 10, n: list.length };
    });

    // Off-spec requests by unit, last 30 days
    const recent = done.filter((r) => within(r.statusAt, 30));
    const offByUnit = units.map((u) => ({ unit: u.name, n: recent.filter((r) => r.unit === u.id && vd.get(r.id).failed > 0).length }));

    const atRisk = active.filter((r) => new Date(r.dueAt) - now < 8 * 3600e3).sort((a, b) => a.dueAt.localeCompare(b.dueAt))
      .map((r) => ({ id: r.id, product: r.product, unit: r.unit, point: r.point, priority: r.priority, status: r.status, dueAt: r.dueAt }));

    const slaMet = certified.filter((r) => new Date(r.statusAt) <= new Date(r.dueAt)).length;
    const sel = series.find((s) => s.id === req.query.series) ?? series[0];
    const readings = sel
      ? await query("SELECT to_char(reading_date, 'DD Mon') AS date, value FROM property_readings WHERE series_id = $1 AND reading_date > current_date - 60 ORDER BY reading_date", [sel.id])
      : [];

    const avgTat = avg(certThis.map(tat)) ?? avg(certified.map(tat)) ?? 0;
    res.json({
      kpis: {
        requestsThisWeek: thisWeek.length,
        requestsDelta: pct(thisWeek.length, lastWeek.length),
        avgTat,
        avgTatDelta: certThis.length && certLast.length ? pct(avg(certThis.map(tat)), avg(certLast.map(tat))) : undefined,
        offRate: offRate(done),
        overdue: overdue.length,
        active: active.length,
        retestRate: all.length ? (all.filter((r) => r.retestOf).length / all.length) * 100 : 0,
      },
      byProduct,
      total: all.length,
      workload,
      tatTrend,
      offByUnit,
      atRisk,
      slaPct: certified.length ? (slaMet / certified.length) * 100 : 0,
      instrumentsAvailable: instruments.length ? (instruments.filter((i) => i.status === 'Online' || i.status === 'In Use').length / instruments.length) * 100 : 0,
      series: series.map((s) => ({ id: s.id, label: s.label, unit: s.unit, method: s.method, limit: s.limit_value, limitLabel: s.limit_label, min: s.is_min, dp: s.decimals })),
      selectedSeries: sel?.id ?? null,
      trend: readings.map((r) => ({ date: r.date, value: Number(r.value) })),
    });
  },
});
