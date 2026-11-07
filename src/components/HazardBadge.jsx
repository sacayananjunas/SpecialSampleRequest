import { Flame, ShieldAlert, Gauge, Radiation, Skull, Thermometer, Moon, Wind } from 'lucide-react';
import { cn } from '../lib/utils';

// GHS-style pictograms: red diamond, white field, black symbol. Always paired with a text label.
const GHS = {
  flame: { label: 'Flammable', code: 'GHS02' },
  gas: { label: 'Gas under pressure', code: 'GHS04' },
  health: { label: 'Health hazard', code: 'GHS08' },
  exclaim: { label: 'Irritant / harmful', code: 'GHS07' },
  env: { label: 'Environmental hazard', code: 'GHS09' },
  toxic: { label: 'Acute toxicity', code: 'GHS06' },
};

function Symbol({ type }) {
  switch (type) {
    case 'flame':
      return <path d="M12 3c1 3-2 4.2-2 7.2 0 1.2.8 2.2 2 2.2s2-1 2-2.3c1.6 1.4 2.4 3 2.4 4.6A4.4 4.4 0 0 1 12 19a4.4 4.4 0 0 1-4.4-4.3C7.6 9.6 12 8 12 3z" fill="#000" />;
    case 'gas':
      return (
        <g fill="#000">
          <rect x="6" y="9" width="12" height="6" rx="3" transform="rotate(-25 12 12)" />
          <rect x="16" y="5.5" width="2.6" height="3" rx=".5" transform="rotate(-25 12 12)" />
        </g>
      );
    case 'health':
      return (
        <g fill="#000">
          <circle cx="12" cy="6.4" r="2" />
          <path d="M8.6 10h6.8v3.6l-1.4 5.4h-4l-1.4-5.4z" />
          <path d="M10.5 12.2l1.5 1.4 1.5-1.4-1.5 2.6z" fill="#fff" />
        </g>
      );
    case 'env':
      return (
        <g fill="#000">
          <path d="M6 18h12v1H6z" />
          <path d="M8 18c0-3 .5-6 .6-9M8.6 9l-2 2M8.6 10.5l2-1.5" stroke="#000" strokeWidth="1" fill="none" />
          <path d="M12 15.5c1.5-1.6 4-1.6 5.6 0-1.6 1.6-4.1 1.6-5.6 0zM17.6 15.5l1.2-1v2z" />
        </g>
      );
    case 'toxic':
      return (
        <g fill="#000">
          <circle cx="12" cy="10" r="3.6" />
          <path d="M7 15.5l10 3M17 15.5l-10 3" stroke="#000" strokeWidth="1.4" />
        </g>
      );
    default:
      return <path d="M11 6h2l-.3 8h-1.4zM12 15.6a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z" fill="#000" />;
  }
}

export function GhsPictogram({ type, size = 44, showLabel = false }) {
  const g = GHS[type] ?? GHS.exclaim;
  return (
    <figure className="inline-flex flex-col items-center gap-1" title={`${g.code} – ${g.label}`}>
      <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={`${g.code} ${g.label}`}>
        <rect x="4.2" y="4.2" width="15.6" height="15.6" transform="rotate(45 12 12)" fill="#fff" stroke="#dc2626" strokeWidth="1.8" />
        <g transform="translate(3.6 3.6) scale(.7)">
          <Symbol type={type} />
        </g>
      </svg>
      {showLabel && <figcaption className="text-center text-[9px] font-semibold leading-tight text-black">{g.label}</figcaption>}
    </figure>
  );
}

const HAZ = {
  flam: [Flame, 'border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-300'],
  h2s: [Skull, 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300'],
  pressure: [Gauge, 'border-sky-500/50 bg-sky-500/10 text-sky-700 dark:text-sky-300'],
  norm: [Radiation, 'border-yellow-500/50 bg-yellow-500/10 text-yellow-800 dark:text-yellow-300'],
  cool: [Thermometer, 'border-cyan-500/50 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'],
  dark: [Moon, 'border-indigo-500/50 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'],
  gas: [Wind, 'border-sky-500/50 bg-sky-500/10 text-sky-700 dark:text-sky-300'],
  generic: [ShieldAlert, 'border-slate-400/50 bg-slate-400/10 text-slate-700 dark:text-graphite-200'],
};

export function HazardBadge({ type = 'generic', children, className }) {
  const [Icon, style] = HAZ[type] ?? HAZ.generic;
  return (
    <span className={cn('chip', style, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </span>
  );
}

export function hazardList(req) {
  const list = [];
  if (req.flamClass && req.flamClass !== 'Not classified') list.push(['flam', req.flamClass.split(' – ')[0] + ' flammable']);
  if (req.h2s) list.push(['h2s', `H₂S ${req.h2sPpm || '?'} ppm`]);
  if (req.pressurized) list.push(['pressure', 'Pressurized']);
  if (req.norm) list.push(['norm', 'Benzene / NORM']);
  if (req.storage === 'Cool <4°C') list.push(['cool', 'Keep < 4°C']);
  if (req.storage === 'Keep Dark') list.push(['dark', 'Keep dark']);
  return list;
}

export function pictogramsFor(req) {
  const set = new Set();
  if (req.flamClass && req.flamClass !== 'Not classified') set.add('flame');
  if (req.pressurized) set.add('gas');
  if (req.h2s) set.add('toxic');
  if (req.norm || ['crude', 'gasoline', 'naphtha', 'diesel'].includes(req.product)) set.add('health');
  if (['crude', 'gasoline', 'naphtha', 'diesel', 'jet', 'fueloil'].includes(req.product)) set.add('env');
  if (set.size === 0) set.add('exclaim');
  return [...set];
}

export default HazardBadge;
