// Property trend series for the supervisor dashboard (60 days of daily results).
import { mulberry32 } from './utils.js';

export const TREND_SERIES = [
  { id: 'hdt-s', label: 'HDT-SP-415 Diesel · Sulfur', unit: 'mg/kg', method: 'ASTM D5453', limit: 10, limitLabel: 'EN 590 max 10', base: 6.2, noise: 1.6, drift: 0.045, dp: 1 },
  { id: 'tk310-s', label: 'TK-310 Diesel · Sulfur', unit: 'mg/kg', method: 'ASTM D5453', limit: 10, limitLabel: 'EN 590 max 10', base: 7.4, noise: 1.9, drift: 0.02, dp: 1 },
  { id: 'fcc-ron', label: 'FCC Gasoline · RON', unit: '', method: 'ASTM D2699', limit: 91, limitLabel: 'D4814 min 91', base: 92.4, noise: 0.6, drift: -0.012, dp: 1, min: true },
  { id: 'kero-fp', label: 'CDU Kero draw · Freezing point', unit: '°C', method: 'ASTM D2386', limit: -47, limitLabel: 'DEF STAN max −47', base: -52, noise: 1.6, drift: 0.04, dp: 1 },
];

export function trendData(seriesId, days = 60) {
  const s = TREND_SERIES.find((x) => x.id === seriesId) ?? TREND_SERIES[0];
  const rng = mulberry32(seriesId.length * 7919 + 13);
  const out = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400e3);
    const t = days - i;
    const spike = rng() > 0.94 ? s.noise * 2.4 * (s.min ? -1 : 1) : 0;
    const v = s.base + s.drift * t + (rng() * 2 - 1) * s.noise + spike;
    out.push({ date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), value: Math.round(v * 10 ** s.dp) / 10 ** s.dp });
  }
  return out;
}
