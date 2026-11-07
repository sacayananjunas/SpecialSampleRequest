import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { AnimatedCounter } from './ui';
import { cn } from '../lib/utils';

/**
 * KPI card with animated counter.
 * delta: number (% change); goodWhen: 'up' | 'down' decides the color of the delta.
 */
export default function KpiCard({ icon: Icon, label, value, decimals = 0, prefix, suffix, delta, goodWhen = 'up', hint, tone = 'amber', index = 0 }) {
  const good = delta === undefined ? null : goodWhen === 'up' ? delta >= 0 : delta <= 0;
  const toneCls = {
    amber: 'from-amber-400/25 to-orange-600/10 text-orange-700 dark:text-amber-300 border-amber-400/30',
    red: 'from-red-500/25 to-red-700/10 text-red-600 dark:text-red-300 border-red-400/30',
    green: 'from-emerald-400/25 to-emerald-700/10 text-emerald-600 dark:text-emerald-300 border-emerald-400/30',
    sky: 'from-sky-400/25 to-sky-700/10 text-sky-600 dark:text-sky-300 border-sky-400/30',
  }[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.45 }}
      className="glass glass-hover relative overflow-hidden p-4 sm:p-5"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-orange-500/10 blur-2xl" aria-hidden="true" />
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wider muted">{label}</div>
        {Icon && (
          <div className={cn('grid h-9 w-9 place-items-center rounded-xl border bg-gradient-to-br', toneCls)}>
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="mt-2 font-display text-3xl font-bold text-slate-900 dark:text-white">
        <AnimatedCounter value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {delta !== undefined && (
          <span className={cn('inline-flex items-center gap-0.5 font-semibold', good ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
            {delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> : <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />}
            {delta > 0 ? '+' : ''}
            {delta}%
            <span className="sr-only">{good ? '(improving)' : '(worsening)'}</span>
          </span>
        )}
        {hint && <span className="muted">{hint}</span>}
      </div>
    </motion.div>
  );
}
