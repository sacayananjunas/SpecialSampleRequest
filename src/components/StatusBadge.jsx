import { Send, PackageCheck, FlaskConical, ClipboardCheck, BadgeCheck, Clock, Zap, Siren, Check, X, AlertTriangle, Info, Hourglass } from 'lucide-react';
import { cn, statusLabel } from '../lib/utils';

const STATUS_STYLE = {
  submitted: ['border-sky-400/40 bg-sky-400/10 text-sky-700 dark:text-sky-300', Send],
  received: ['border-violet-400/40 bg-violet-400/10 text-violet-700 dark:text-violet-300', PackageCheck],
  analysis: ['border-amber-400/50 bg-amber-400/10 text-amber-700 dark:text-amber-300', FlaskConical],
  qc: ['border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-700 dark:text-fuchsia-300', ClipboardCheck],
  certified: ['border-emerald-400/40 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300', BadgeCheck],
};

export function StatusBadge({ status, className }) {
  const [style, Icon] = STATUS_STYLE[status] ?? STATUS_STYLE.submitted;
  return (
    <span className={cn('chip whitespace-nowrap', style, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {statusLabel(status)}
    </span>
  );
}

export function PriorityBadge({ priority, className, long = false }) {
  if (priority === 'Critical')
    return (
      <span className={cn('chip whitespace-nowrap border-red-500/60 bg-red-500/15 text-red-700 dark:text-red-300 animate-pulse-ring', className)}>
        <Siren className="h-3.5 w-3.5" aria-hidden="true" />
        {long ? 'Critical – Shipment Hold' : 'Critical'}
      </span>
    );
  if (priority === 'Urgent')
    return (
      <span className={cn('chip whitespace-nowrap border-orange-400/50 bg-orange-400/10 text-orange-700 dark:text-orange-300', className)}>
        <Zap className="h-3.5 w-3.5" aria-hidden="true" />
        Urgent
      </span>
    );
  return (
    <span className={cn('chip whitespace-nowrap border-slate-300 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-graphite-300', className)}>
      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
      Routine
    </span>
  );
}

const FLAG_STYLE = {
  PASS: ['border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', Check, 'PASS'],
  'OFF-SPEC': ['border-amber-500/50 bg-amber-500/15 text-amber-800 dark:text-amber-300', AlertTriangle, 'OFF-SPEC'],
  FAIL: ['border-red-500/50 bg-red-500/15 text-red-700 dark:text-red-300', X, 'FAIL'],
  INFO: ['border-slate-300 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-graphite-300', Info, 'REPORT'],
  PENDING: ['border-dashed border-slate-300 text-slate-500 dark:border-white/15 dark:text-graphite-400', Hourglass, 'PENDING'],
};

export function FlagBadge({ flag, className }) {
  const [style, Icon, label] = FLAG_STYLE[flag] ?? FLAG_STYLE.PENDING;
  return (
    <span className={cn('chip whitespace-nowrap font-mono text-[11px] tracking-wide', style, className)}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden="true" />
      {label}
    </span>
  );
}

export default StatusBadge;
