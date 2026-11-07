import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { STATUSES, statusIndex, cn, fmtDateTime } from '../lib/utils';

/** Status timeline: Submitted → Received → In Analysis → QC Review → Certified. Fills step by step. */
export default function Timeline({ status, custody = [], compact = false, className }) {
  const idx = statusIndex(status);
  const pct = (idx / (STATUSES.length - 1)) * 100;
  const timeFor = (sid) => {
    const map = { submitted: 'Request submitted', received: 'Sample received', analysis: 'Analysis started', qc: 'QC review', certified: 'certified' };
    const hit = custody.find((c) => c.action.toLowerCase().includes(map[sid].toLowerCase()) || c.action.includes(STATUSES.find((s) => s.id === sid).label));
    return hit?.at;
  };

  return (
    <div className={cn('relative', className)} role="list" aria-label={`Progress: step ${idx + 1} of ${STATUSES.length}, ${STATUSES[idx]?.label}`}>
      <div className={cn('absolute left-0 right-0 rounded-full bg-slate-200 dark:bg-white/10', compact ? 'top-[9px] h-[3px] mx-[9px]' : 'top-[15px] h-1 mx-4')} />
      <div className={cn('absolute left-0 right-0', compact ? 'top-[9px] mx-[9px]' : 'top-[15px] mx-4')}>
        <motion.div
          className={cn('rounded-full bg-gradient-to-r from-amber-300 via-orange-500 to-orange-600 shadow-[0_0_12px_rgba(249,115,22,.6)]', compact ? 'h-[3px]' : 'h-1')}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4 * Math.max(idx, 1), ease: 'easeOut' }}
        />
      </div>
      <ol className="relative flex justify-between">
        {STATUSES.map((s, i) => {
          const done = i < idx || (i === idx && s.id === 'certified');
          const current = i === idx && s.id !== 'certified';
          const t = !compact && i <= idx ? timeFor(s.id) : null;
          return (
            <li key={s.id} role="listitem" className="flex flex-1 flex-col items-center first:items-start last:items-end" aria-current={current ? 'step' : undefined}>
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.35 * i, type: 'spring', stiffness: 260, damping: 18 }}
                className={cn(
                  'relative z-10 grid place-items-center rounded-full border-2 font-mono font-semibold',
                  compact ? 'h-[21px] w-[21px] text-[9px]' : 'h-8 w-8 text-xs',
                  done && 'border-orange-500 bg-gradient-to-br from-amber-400 to-orange-600 text-graphite-950',
                  current && 'border-orange-500 bg-white text-orange-700 dark:bg-graphite-900 dark:text-amber-300 ring-4 ring-orange-500/20',
                  !done && !current && 'border-slate-300 bg-white text-slate-400 dark:border-white/15 dark:bg-graphite-900 dark:text-graphite-500',
                )}
              >
                {done ? <Check className={compact ? 'h-3 w-3' : 'h-4 w-4'} strokeWidth={3} aria-hidden="true" /> : i + 1}
                {current && <span className="absolute inset-0 animate-ping rounded-full border-2 border-orange-500/50" aria-hidden="true" />}
              </motion.span>
              {!compact && (
                <span className={cn('mt-2 max-w-[90px] text-center text-[11px] font-semibold leading-tight sm:max-w-none sm:text-xs', i === 0 && 'text-left', i === STATUSES.length - 1 && 'text-right', i <= idx ? 'text-slate-800 dark:text-graphite-100' : 'muted')}>
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{s.short}</span>
                  {t && <span className="mt-0.5 block font-mono text-[10px] font-normal muted">{fmtDateTime(t).slice(0, 6) + ' ' + fmtDateTime(t).slice(-5)}</span>}
                </span>
              )}
              <span className="sr-only">{done ? 'completed' : current ? 'current step' : 'not started'}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
