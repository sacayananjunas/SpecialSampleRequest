// Business rules shared by the React frontend and the /api functions.
// Pure functions and constants only: no database, no browser APIs.

export const SITES = ['Bataan Refinery', 'Batangas Terminal', 'Mindanao Polymer Complex'];
export const DEPARTMENTS = ['Process Engineering', 'Operations', 'Quality Assurance', 'Trading & Supply', 'Technical Services', 'HSE', 'R&D', 'Central Laboratory'];

export const PRODUCTS = [
  { id: 'crude', name: 'Crude Oil', flam: 'Cat 1' },
  { id: 'naphtha', name: 'Naphtha', flam: 'Cat 1' },
  { id: 'gasoline', name: 'Gasoline', flam: 'Cat 1' },
  { id: 'jet', name: 'Kerosene / Jet Fuel', flam: 'Cat 3' },
  { id: 'diesel', name: 'Diesel', flam: 'Cat 3' },
  { id: 'fueloil', name: 'Fuel Oil', flam: 'Cat 4' },
  { id: 'lube', name: 'Lube Base Oil', flam: 'Not classified' },
  { id: 'lpg', name: 'LPG', flam: 'Cat 1 (gas)' },
  { id: 'natgas', name: 'Natural Gas', flam: 'Cat 1 (gas)' },
  { id: 'polymer', name: 'Polymer (PE/PP)', flam: 'Not classified' },
  { id: 'catalyst', name: 'Catalyst', flam: 'Not classified' },
  { id: 'water', name: 'Process / Waste Water', flam: 'Not classified' },
  { id: 'other', name: 'Other', flam: 'Unknown' },
];
export const GAS_PRODUCTS = ['lpg', 'natgas'];

export const CONTAINERS = [
  { id: 'glass', name: 'Glass bottle' },
  { id: 'can', name: 'Epoxy-lined can' },
  { id: 'cylinder', name: 'Pressure cylinder' },
  { id: 'fpc', name: 'Floating-piston cylinder' },
  { id: 'gasbag', name: 'Gas bag' },
];

export const PURPOSES = ['Process Control', 'Product Release', 'Shipment / Custody Transfer', 'Troubleshooting', 'Customer Complaint', 'R&D'];
export const FLAM_CLASSES = ['Cat 1 – Extremely flammable', 'Cat 2 – Highly flammable', 'Cat 3 – Flammable', 'Cat 4 – Combustible', 'Not classified'];
export const STORAGE = ['Ambient', 'Cool <4°C', 'Keep Dark'];
export const PRIORITIES = ['Routine', 'Urgent', 'Critical'];
export const VOLUMES = ['100 mL', '250 mL', '500 mL', '1 L', '2 L', '4 L', '5 kg'];
export const ISSUE_TYPES = ['Container leaking', 'Insufficient volume', 'Sample contaminated with water', 'Seal broken', 'Label missing / illegible', 'Wrong container type'];
export const INSTRUMENT_STATES = ['Online', 'In Use', 'Calibration Due', 'Down'];

export const STATUSES = [
  { id: 'submitted', label: 'Submitted', short: 'Submitted' },
  { id: 'received', label: 'Sample Received', short: 'Received' },
  { id: 'analysis', label: 'In Analysis', short: 'Analysis' },
  { id: 'qc', label: 'QC Review', short: 'QC' },
  { id: 'certified', label: 'Certified / Released', short: 'Certified' },
];
export const statusIndex = (id) => STATUSES.findIndex((s) => s.id === id);
export const statusLabel = (id) => STATUSES.find((s) => s.id === id)?.label ?? id;

// Turnaround SLA (hours) and price multiplier per priority
export const PRIORITY_SLA = { Routine: 72, Urgent: 24, Critical: 8 };
export const SURCHARGE = { Routine: 1, Urgent: 1.25, Critical: 1.5 };

/** tests: [{ price, tat }] */
export function estimateFrom(tests, numSamples = 1, priority = 'Routine') {
  const base = tests.reduce((s, t) => s + t.price, 0) * Math.max(1, Number(numSamples) || 1);
  const cost = base * (SURCHARGE[priority] ?? 1);
  const maxTat = tests.reduce((m, t) => Math.max(m, t.tat), 0);
  const queue = priority === 'Critical' ? 0 : priority === 'Urgent' ? 2 : 16;
  const hours = tests.length ? Math.max(maxTat + queue, Math.min(PRIORITY_SLA[priority], maxTat + queue + 8)) : 0;
  return { cost, base, hours, maxTat, count: tests.length };
}

/** Due date: the priority SLA, but never shorter than the slowest test + 2 h */
export function dueAtFrom(createdAt, maxTat, priority) {
  const h = Math.max(PRIORITY_SLA[priority] ?? 72, maxTat + 2);
  return new Date(new Date(createdAt).getTime() + h * 3600e3).toISOString();
}

/**
 * Spec evaluation.
 * PASS within limits · OFF-SPEC outside the limit but within method reproducibility (3 %) · FAIL clearly outside
 * INFO no limit (report only) · PENDING no result yet
 */
export function evaluate(value, limit) {
  if (value === null || value === undefined || value === '') return 'PENDING';
  if (!limit || (limit.min === undefined && limit.max === undefined)) return 'INFO';
  const v = Number(value);
  const tol = (lim) => Math.max(Math.abs(lim) * 0.03, 0.005);
  if (limit.max !== undefined && v > limit.max) return v - limit.max <= tol(limit.max) ? 'OFF-SPEC' : 'FAIL';
  if (limit.min !== undefined && v < limit.min) return limit.min - v <= tol(limit.min) ? 'OFF-SPEC' : 'FAIL';
  return 'PASS';
}

/** results: { testId: { value } }, limits: { testId: { min, max } } */
export function summarize(testIds, results, limits) {
  const flags = testIds.map((t) => evaluate(results?.[t]?.value ?? null, limits?.[t]));
  const entered = flags.filter((f) => f !== 'PENDING').length;
  const failed = flags.filter((f) => f === 'FAIL' || f === 'OFF-SPEC').length;
  const complete = testIds.length > 0 && entered === testIds.length;
  return { entered, failed, complete, total: testIds.length, onSpec: complete && failed === 0 };
}
