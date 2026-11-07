import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, animate, useInView } from 'framer-motion';
import { X, AlertTriangle, Inbox } from 'lucide-react';
import { cn, fmtCountdown } from '../lib/utils';

export const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
};

export function Page({ children, className }) {
  return (
    <motion.div {...fadeUp} className={cn('mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8', className)}>
      {children}
    </motion.div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions, icon: Icon }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="mt-1 hidden h-11 w-11 shrink-0 place-items-center rounded-xl border border-amber-400/30 bg-gradient-to-br from-amber-400/20 to-orange-600/10 text-orange-700 dark:text-amber-300 sm:grid">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
        <div>
          {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className, hover = false, ...rest }) {
  return (
    <div className={cn('glass p-5', hover && 'glass-hover', className)} {...rest}>
      {children}
    </div>
  );
}

export function AnimatedCounter({ value, decimals = 0, prefix = '', suffix = '', duration = 1.4 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setDisplay(v) });
    return () => controls.stop();
  }, [value, inView, duration]);
  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {display.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

/** Semicircle gauge meter */
export function Gauge({ value, max = 100, label, unit = '%', size = 140, tone = 'amber', decimals = 0 }) {
  const r = 52;
  const len = Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const colors = { amber: ['#fbbf24', '#ea580c'], green: ['#34d399', '#059669'], red: ['#f87171', '#dc2626'] }[tone];
  const id = `gg-${label?.replace(/\W/g, '')}-${tone}`;
  return (
    <div className="flex flex-col items-center" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      <svg width={size} height={size * 0.62} viewBox="0 0 120 74">
        <defs>
          <linearGradient id={id} x1="0" x2="1">
            <stop offset="0" stopColor={colors[0]} />
            <stop offset="1" stopColor={colors[1]} />
          </linearGradient>
        </defs>
        <path d="M8 66 A52 52 0 0 1 112 66" fill="none" className="stroke-slate-200 dark:stroke-white/10" strokeWidth="10" strokeLinecap="round" />
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const a = Math.PI * (1 - t);
          return <line key={t} x1={60 + 40 * Math.cos(a)} y1={66 - 40 * Math.sin(a)} x2={60 + 36 * Math.cos(a)} y2={66 - 36 * Math.sin(a)} className="stroke-slate-400 dark:stroke-graphite-500" strokeWidth="1.2" />;
        })}
        <motion.path
          d="M8 66 A52 52 0 0 1 112 66"
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={len}
          initial={{ strokeDashoffset: len }}
          whileInView={{ strokeDashoffset: len * (1 - pct) }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${colors[1]}66)` }}
        />
        <text x="60" y="60" textAnchor="middle" className="fill-slate-900 font-mono dark:fill-white" fontSize="20" fontWeight="600">
          {Number(value).toFixed(decimals)}
          <tspan fontSize="11" className="fill-slate-500 dark:fill-graphite-400">{unit}</tspan>
        </text>
      </svg>
      {label && <div className="-mt-1 text-xs font-medium muted">{label}</div>}
    </div>
  );
}

export function useNow(interval = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(t);
  }, [interval]);
  return now;
}

export function Countdown({ to, className, label = true }) {
  const now = useNow(1000);
  const ms = new Date(to).getTime() - now;
  const overdue = ms < 0;
  const warn = !overdue && ms < 4 * 3600e3;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-mono text-xs font-semibold tabular-nums',
        overdue ? 'text-red-700 dark:text-red-400' : warn ? 'text-orange-700 dark:text-amber-300' : 'text-slate-600 dark:text-graphite-300',
        className,
      )}
      aria-label={overdue ? `Overdue by ${fmtCountdown(-ms)}` : `Due in ${fmtCountdown(ms)}`}
    >
      {label && <span className="font-sans font-semibold uppercase tracking-wide text-[10px]">{overdue ? 'Overdue' : 'Due in'}</span>}
      {fmtCountdown(Math.abs(ms))}
    </span>
  );
}

export function Modal({ open, onClose, title, children, footer, size = 'md', icon: Icon }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.activeElement;
    setTimeout(() => ref.current?.querySelector('input,select,textarea,button:not([data-close])')?.focus(), 50);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4 no-print" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-graphite-950/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 30, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className={cn(
              'glass relative flex max-h-[92vh] w-full flex-col rounded-b-none !bg-white dark:!bg-graphite-900 sm:rounded-2xl',
              { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl' }[size],
            )}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                {Icon && <Icon className="h-5 w-5 text-orange-500" aria-hidden="true" />}
                {title}
              </h2>
              <button data-close onClick={onClose} className="rounded-lg p-1.5 muted hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Close dialog">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4 scrollbar-thin">{children}</div>
            {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-white/10">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      icon={AlertTriangle}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
        </>
      }
    >
      <p className="text-sm muted">{message}</p>
    </Modal>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-full bg-orange-500/20 blur-xl" aria-hidden="true" />
        <div className="relative grid h-16 w-16 place-items-center rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-400/15 to-orange-600/10 text-orange-500 animate-float">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm muted">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Select({ value, onChange, options, label, className, id }) {
  return (
    <label className={cn('block', className)} htmlFor={id}>
      <span className="sr-only">{label}</span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="input !py-2 pr-8" aria-label={label}>
        {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
    </label>
  );
}
