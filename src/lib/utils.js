import { testById } from '../data/testCatalog';
import { specLimit, SPECS } from '../data/specs';
import { estimateFrom, evaluate, STATUSES, statusIndex, statusLabel } from '../../shared/rules.js';

export { evaluate, STATUSES, statusIndex, statusLabel };

export const cn = (...c) => c.filter(Boolean).join(' ');

// ---------- formatting ----------
const pad = (n) => String(n).padStart(2, '0');
export const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
export const fmtDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${fmtDate(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fmtMoney = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
export const fmtHours = (h) => {
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${Math.round(h * 10) / 10} h`;
  return `${Math.round((h / 24) * 10) / 10} days`;
};
export const relTime = (iso) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return `${Math.floor(diff / 86400)} d ago`;
};
export const fmtCountdown = (ms) => {
  const neg = ms < 0;
  const s = Math.abs(Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const body = h >= 48 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
  return neg ? `-${body}` : body;
};

export const fmtValue = (value, testId) => {
  if (value === null || value === undefined || value === '') return '—';
  const dp = testById(testId)?.dp ?? 2;
  return Number(value).toFixed(dp);
};

// ---------- estimates (same rules the API uses for due dates) ----------
export function estimate(tests = [], numSamples = 1, priority = 'Routine') {
  return estimateFrom(tests.map(testById).filter(Boolean), numSamples, priority);
}

// ---------- spec evaluation ----------
export function requestResults(req) {
  return (req.tests || []).map((tid) => {
    const t = testById(tid);
    const limit = specLimit(req.spec, tid);
    const r = req.results?.[tid];
    const value = r?.value ?? null;
    return { test: t, testId: tid, limit, value, by: r?.by, at: r?.at, flag: evaluate(value, limit) };
  });
}

export function verdict(req) {
  const rows = requestResults(req);
  const entered = rows.filter((r) => r.flag !== 'PENDING');
  const failed = rows.filter((r) => r.flag === 'FAIL' || r.flag === 'OFF-SPEC');
  const complete = entered.length === rows.length && rows.length > 0;
  return {
    rows,
    complete,
    entered: entered.length,
    total: rows.length,
    failed: failed.length,
    onSpec: complete && failed.length === 0,
    specName: SPECS[req.spec]?.short ?? req.spec,
  };
}
