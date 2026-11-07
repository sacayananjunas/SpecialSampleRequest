// GET /api/catalog: reference data (process units, test catalog, specs with limits, test packages).
import { query } from '../lib/db.js';
import { route } from '../lib/http.js';
import { requireUser } from '../lib/auth.js';

export default route({
  GET: async (req, res) => {
    await requireUser(req);
    const [units, tests, specs, limits, packages, pkgTests] = await Promise.all([
      query('SELECT id, name, full_name, points FROM process_units ORDER BY sort_order'),
      query('SELECT * FROM tests ORDER BY sort_order'),
      query('SELECT id, name, short_name, label FROM specs ORDER BY sort_order'),
      query('SELECT spec_id, test_id, min_value, max_value, nominal FROM spec_limits'),
      query('SELECT id, name, product, spec_id FROM packages ORDER BY sort_order'),
      query('SELECT package_id, test_id FROM package_tests ORDER BY package_id, order_index'),
    ]);
    const lim = (l) => ({ ...(l.min_value !== null && { min: l.min_value }), ...(l.max_value !== null && { max: l.max_value }), ...(l.nominal !== null && { nominal: l.nominal }) });
    res.json({
      units: units.map((u) => ({ id: u.id, name: u.name, full: u.full_name, points: u.points })),
      tests: tests.map((t) => ({
        id: t.id, name: t.name, method: t.method, unit: t.unit, range: [t.range_min, t.range_max], dp: t.decimals, types: t.sample_types,
        minVol: t.min_volume, container: t.container, tat: t.tat_hours, price: t.price, instrument: t.instrument, notes: t.notes,
      })),
      specs: specs.map((s) => ({
        id: s.id, name: s.name, short: s.short_name, label: s.label,
        limits: Object.fromEntries(limits.filter((l) => l.spec_id === s.id).map((l) => [l.test_id, lim(l)])),
      })),
      packages: packages.map((p) => ({ id: p.id, name: p.name, product: p.product, spec: p.spec_id, tests: pkgTests.filter((x) => x.package_id === p.id).map((x) => x.test_id) })),
    });
  },
});
