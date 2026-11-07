// Mock sample requests generated deterministically (dates are relative to first load, then persisted).
import { packageById } from './testCatalog.js';
import { specLimit } from './specs.js';
import { REQUESTERS, ANALYSTS, SUPERVISOR, SAMPLERS } from './people.js';
import { PRODUCTS } from './plantUnits.js';
import { mulberry32, dueDate } from './utils.js';
import { testById } from './testCatalog.js';

// [package, unit, point, purpose, priority, status, requesterIdx, hoursAgo (active) | null, offSpec values, extras]
const T = [
  ['en590', 'HDT', 'HDT-SP-415 Product', 'Product Release', 'Routine', 'certified', 0, null, {}],
  ['gasrel', 'TANK', 'TK-205', 'Product Release', 'Routine', 'certified', 2, null, {}],
  ['jet', 'JETTY', 'JT-01 Loading arm A', 'Shipment / Custody Transfer', 'Urgent', 'certified', 3, null, {}],
  ['crude', 'TANK', 'TK-101', 'Shipment / Custody Transfer', 'Routine', 'certified', 3, null, { h2s: 18.4 }],
  ['en590', 'TANK', 'TK-310', 'Product Release', 'Routine', 'certified', 2, null, { sulfur: 14.2, cfpp: -3 }],
  ['lpg', 'TANK', 'SPH-01 (LPG sphere)', 'Product Release', 'Routine', 'certified', 1, null, {}],
  ['poly', 'POLY', 'PP-SP-610 PP pellets', 'Process Control', 'Routine', 'certified', 1, null, { mfi: 15.8 }],
  ['d975', 'CDU', 'CDU-SP-130 Diesel draw', 'Process Control', 'Routine', 'certified', 0, null, {}],
  ['water', 'HDT', 'HDT-SP-422 Sour water', 'Process Control', 'Routine', 'certified', 4, null, {}],
  ['gasrel', 'FCC', 'FCC-SP-318 Gasoline', 'Troubleshooting', 'Urgent', 'certified', 0, null, { ron: 89.9, rvp: 74.5 }],
  ['jet', 'CDU', 'CDU-SP-121 Kero draw', 'Process Control', 'Routine', 'certified', 0, null, { freeze: -46.2 }],
  ['fo', 'VDU', 'VDU-SP-214 Vacuum residue', 'R&D', 'Routine', 'certified', 5, null, {}],
  ['gas', 'REF', 'REF-SP-520 Net gas', 'Process Control', 'Routine', 'certified', 4, null, {}],
  ['en590', 'TANK', 'TK-206', 'Customer Complaint', 'Urgent', 'qc', 2, 22, { kf: 203 }],
  ['gasrel', 'TANK', 'TK-415', 'Product Release', 'Urgent', 'qc', 1, 20, {}],
  ['crude', 'JETTY', 'JT-03 Ship manifold', 'Shipment / Custody Transfer', 'Critical', 'qc', 3, 21.5, {}],
  ['d975', 'HDT', 'HDT-SP-415 Product', 'Troubleshooting', 'Routine', 'qc', 0, 40, { sulfur: 15.3 }],
  ['poly', 'POLY', 'PE-SP-620 HDPE pellets', 'Process Control', 'Routine', 'qc', 1, 30, {}],
  ['jet', 'JETTY', 'JT-02 Loading arm B', 'Shipment / Custody Transfer', 'Critical', 'analysis', 3, 6.2, {}],
  ['en590', 'HDT', 'HDT-SP-415 Product', 'Process Control', 'Urgent', 'analysis', 0, 14, {}],
  ['gasrel', 'REF', 'REF-SP-512 Reformate', 'Troubleshooting', 'Routine', 'analysis', 0, 26, { piano: 38.6 }],
  ['lpg', 'TANK', 'SPH-01 (LPG sphere)', 'Shipment / Custody Transfer', 'Critical', 'analysis', 3, 9.4, {}],
  ['crude', 'CDU', 'CDU-SP-101 Crude feed', 'Process Control', 'Routine', 'analysis', 4, 30, {}],
  ['fo', 'TANK', 'TK-102', 'Product Release', 'Urgent', 'analysis', 2, 12, {}, { issue: 'Insufficient volume' }],
  ['water', 'HDT', 'HDT-SP-422 Sour water', 'Troubleshooting', 'Routine', 'analysis', 4, 34, { btex: 72.4 }],
  ['en590', 'TANK', 'TK-310', 'Product Release', 'Urgent', 'received', 2, 5, {}, { retestOf: 4 }],
  ['jet', 'CDU', 'CDU-SP-121 Kero draw', 'Process Control', 'Routine', 'received', 0, 8, {}],
  ['gasrel', 'JETTY', 'JT-01 Loading arm A', 'Shipment / Custody Transfer', 'Critical', 'received', 3, 2.5, {}],
  ['gas', 'REF', 'REF-SP-520 Net gas', 'R&D', 'Routine', 'received', 5, 9, {}],
  ['crude', 'TANK', 'TK-101', 'Troubleshooting', 'Routine', 'received', 1, 4, {}, { issue: 'Sample contaminated with water' }],
  ['d975', 'CDU', 'CDU-SP-130 Diesel draw', 'Process Control', 'Routine', 'submitted', 0, 3, {}],
  ['lpg', 'TANK', 'SPH-01 (LPG sphere)', 'Product Release', 'Urgent', 'submitted', 1, 1.5, {}],
  ['poly', 'POLY', 'PP-SP-610 PP pellets', 'Customer Complaint', 'Urgent', 'submitted', 2, 2.2, {}],
  ['en590', 'JETTY', 'JT-02 Loading arm B', 'Shipment / Custody Transfer', 'Critical', 'submitted', 3, 0.6, {}],
  ['fo', 'VDU', 'VDU-SP-201 VGO', 'R&D', 'Routine', 'submitted', 5, 4.5, {}],
  ['gasrel', 'FCC', 'FCC-SP-318 Gasoline', 'Process Control', 'Routine', 'submitted', 0, 0.3, {}],
];

const ORDER = ['submitted', 'received', 'analysis', 'qc', 'certified'];
const FRACTIONS = { received: 0.12, analysis: 0.28, qc: 0.82, certified: 1 };

const COMMENTS = [
  ['requester', 'Please prioritise sulfur — we need it before the shift handover.'],
  ['lab', 'Noted. Sulfur is queued first on the UVF analyser, ETA ~2 h.'],
  ['requester', 'Ship is scheduled to berth at 18:00, any chance of a preliminary result?'],
  ['lab', 'Preliminary density and flash will be shared by 15:00. Full CoA after QC review.'],
  ['lab', 'Container received ~70% full. Proceeding, but RVP may read slightly low.'],
  ['requester', 'Thanks — retain sample please, QA may want a referee test.'],
];

function round(v, dp) {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}

function genValue(rng, testId, spec) {
  const t = testById(testId);
  const lim = specLimit(spec, testId) || {};
  const nominal = lim.nominal ?? (t.range[0] + t.range[1]) / 2;
  if (testId === 'copper') return 1;
  let spread;
  if (lim.min !== undefined && lim.max !== undefined) spread = (lim.max - lim.min) * 0.12;
  else if (lim.max !== undefined) spread = Math.abs(lim.max - nominal) * 0.35;
  else if (lim.min !== undefined) spread = Math.abs(nominal - lim.min) * 0.35;
  else spread = Math.abs(nominal) * 0.05;
  let v = nominal + (rng() * 2 - 1) * spread;
  if (lim.max !== undefined) v = Math.min(v, lim.max - spread * 0.1);
  if (lim.min !== undefined) v = Math.max(v, lim.min + spread * 0.1);
  v = Math.max(t.range[0], Math.min(t.range[1], v));
  return round(v, t.dp);
}

export function generateMockRequests(now = Date.now()) {
  const rng = mulberry32(20261107);
  const H = 3600e3;
  const list = T.map((row, i) => {
    const [pkgId, unit, point, purpose, priority, status, reqIdx, hoursAgo, offSpec, extras = {}] = row;
    const pkg = packageById(pkgId);
    const product = PRODUCTS.find((p) => p.id === pkg.product);
    const requester = REQUESTERS[reqIdx];
    const analyst = ANALYSTS[i % ANALYSTS.length];
    const age = hoursAgo ?? 60 + i * 52 + rng() * 20;
    const created = now - age * H;
    const span = status === 'certified' ? 18 + rng() * 40 : age;
    const reached = ORDER.slice(1, ORDER.indexOf(status) + 1);
    const at = (s) => new Date(created + span * FRACTIONS[s] * (status === 'certified' ? 1 : 0.97) * H).toISOString();

    const custody = [{ at: new Date(created).toISOString(), by: requester.name, role: 'Requester', action: 'Request submitted', note: `Sampled at ${point}` }];
    if (reached.includes('received')) {
      custody.push({ at: at('received'), by: 'M. Lim', role: 'Sample Reception', action: 'Sample received at lab', note: 'Seal intact · temp 21°C · logged to Bay B-3' });
    }
    if (reached.includes('analysis')) custody.push({ at: at('analysis'), by: analyst, role: 'Lab Analyst', action: 'Analysis started', note: `${pkg.tests.length} tests assigned` });
    if (reached.includes('qc')) custody.push({ at: at('qc'), by: analyst, role: 'Lab Analyst', action: 'Results entered — sent to QC review', note: 'Duplicate checks within repeatability' });
    if (reached.includes('certified')) {
      custody.push({ at: at('certified'), by: SUPERVISOR, role: 'Lab Supervisor', action: 'Results certified', note: 'CoA issued' });
      custody.push({ at: at('certified'), by: 'M. Lim', role: 'Sample Reception', action: 'Retain sample archived', note: 'Retain shelf R-12 · 90 days' });
    }

    // results
    const results = {};
    const idx = ORDER.indexOf(status);
    if (idx >= 2) {
      const tests = idx >= 3 ? pkg.tests : pkg.tests.filter((t, k) => k < Math.ceil(pkg.tests.length * 0.6) || offSpec[t] !== undefined);
      const t0 = new Date(at('analysis')).getTime();
      const t1 = idx >= 3 ? new Date(at('qc')).getTime() : now - 10 * 60e3;
      tests.forEach((tid, k) => {
        const value = offSpec[tid] !== undefined ? offSpec[tid] : genValue(rng, tid, pkg.spec);
        results[tid] = { value, by: analyst, at: new Date(t0 + ((t1 - t0) * (k + 1)) / (tests.length + 1)).toISOString() };
      });
    }

    const comments = [];
    if (i % 3 === 0) {
      const n = 1 + (i % 4 === 0 ? 2 : 1);
      for (let c = 0; c < n; c++) {
        const [who, text] = COMMENTS[(i + c) % COMMENTS.length];
        comments.push({
          id: `c${i}-${c}`,
          at: new Date(created + (c + 0.5) * Math.min(span, 6) * 0.15 * H).toISOString(),
          by: who === 'requester' ? requester.name : analyst,
          role: who === 'requester' ? 'Requester' : 'Lab',
          text,
        });
      }
    }

    const issues = [];
    if (extras.issue) {
      issues.push({ type: extras.issue, at: at(status === 'received' ? 'received' : 'analysis'), by: analyst });
      custody.push({ at: issues[0].at, by: analyst, role: 'Lab Analyst', action: `Issue flagged: ${extras.issue}`, note: 'Requester notified' });
    }

    const gas = ['lpg', 'natgas'].includes(product.id);
    const container = product.id === 'lpg' ? 'fpc' : product.id === 'natgas' ? 'cylinder' : product.id === 'gasoline' ? 'can' : 'glass';
    const h2s = ['crude', 'lpg', 'natgas', 'water'].includes(product.id);
    return {
      id: `PS-2026-${String(101 + i).padStart(5, '0')}`,
      createdAt: new Date(created).toISOString(),
      requester: { name: requester.name, dept: requester.dept },
      site: unit === 'POLY' ? 'Mindanao Polymer Complex' : unit === 'JETTY' && i % 2 ? 'Batangas Terminal' : 'Bataan Refinery',
      unit,
      point,
      batch: `B-${2600 + ((i * 37) % 300)}-${String.fromCharCode(65 + (i % 6))}`,
      costCenter: `CC-${4100 + (reqIdx * 110)}`,
      product: product.id,
      numSamples: product.id === 'polymer' ? 3 : i % 5 === 0 ? 2 : 1,
      sampledAt: new Date(created - (0.5 + rng() * 2) * H).toISOString(),
      sampledBy: SAMPLERS[i % SAMPLERS.length],
      volume: gas ? '500 mL' : product.id === 'gasoline' ? '2 L' : '1 L',
      container,
      packageId: pkg.id,
      packageName: pkg.name,
      tests: [...pkg.tests],
      purpose,
      spec: pkg.spec,
      flamClass: product.flam.startsWith('Cat 1') ? 'Cat 1 – Extremely flammable' : product.flam === 'Cat 3' ? 'Cat 3 – Flammable' : product.flam === 'Cat 4' ? 'Cat 4 – Combustible' : 'Not classified',
      h2s,
      h2sPpm: h2s ? Math.round(5 + rng() * 120) : '',
      pressurized: gas,
      norm: ['gasoline', 'naphtha', 'water'].includes(product.id),
      storage: product.id === 'gasoline' || product.id === 'water' ? 'Cool <4°C' : product.id === 'jet' ? 'Keep Dark' : 'Ambient',
      retain: purpose === 'Product Release' || purpose.startsWith('Shipment'),
      instructions: i % 4 === 1 ? 'Shake well before sub-sampling. Do not open near ignition sources.' : '',
      priority,
      attachments: i % 2 === 0 ? [{ name: `SDS_${product.name.split(' ')[0]}.pdf`, size: 284000 }, { name: `Sampling_sheet_${point.split(' ')[0]}.pdf`, size: 96000 }] : [],
      status,
      statusAt: custody[custody.length - 1].at,
      dueAt: dueDate(new Date(created).toISOString(), pkg.tests, priority),
      custody: custody.sort((a, b) => a.at.localeCompare(b.at)),
      comments,
      results,
      issues,
      retestOf: extras.retestOf !== undefined ? `PS-2026-${String(101 + extras.retestOf).padStart(5, '0')}` : null,
    };
  });
  return list;
}
