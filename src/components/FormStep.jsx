import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

/** Animated wrapper for one wizard step */
export default function FormStep({ title, description, icon: Icon, children, direction = 1 }) {
  return (
    <motion.section
      key={title}
      initial={{ opacity: 0, x: 30 * direction }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 * direction }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      aria-labelledby="step-title"
    >
      <div className="mb-5 flex items-start gap-3">
        {Icon && (
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-amber-400/30 bg-gradient-to-br from-amber-400/20 to-orange-600/10 text-orange-700 dark:text-amber-300">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
        <div>
          <h2 id="step-title" className="text-xl font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-sm muted">{description}</p>}
        </div>
      </div>
      {children}
    </motion.section>
  );
}

/** Labelled field with inline friendly error */
export function Field({ label, htmlFor, error, hint, required, children, className }) {
  const errId = htmlFor ? `${htmlFor}-error` : undefined;
  return (
    <div className={cn('min-w-0', className)}>
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label}
          {required && <span className="ml-0.5 text-orange-500" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <motion.p
          id={errId}
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1.5 flex items-start gap-1 text-xs font-medium text-red-600 dark:text-red-400"
        >
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </motion.p>
      ) : hint ? (
        <p className="mt-1.5 text-xs muted">{hint}</p>
      ) : null}
    </div>
  );
}

/** Pill-style radio group */
export function ChoiceGroup({ name, options, value, onChange, error, columns = 'grid-cols-2 sm:grid-cols-3', render }) {
  return (
    <div role="radiogroup" aria-invalid={!!error} className={cn('grid gap-2', columns)}>
      {options.map((o) => {
        const val = typeof o === 'string' ? o : o.value;
        const lbl = typeof o === 'string' ? o : o.label;
        const checked = value === val;
        return (
          <label
            key={val}
            className={cn(
              'relative flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition',
              'focus-within:ring-2 focus-within:ring-amber-400',
              checked
                ? 'border-orange-500 bg-gradient-to-br from-amber-400/15 to-orange-600/10 font-semibold text-slate-900 shadow-glow dark:text-white'
                : 'border-slate-300 bg-white/60 hover:border-amber-400/60 dark:border-white/10 dark:bg-white/[0.02]',
              error && !checked && 'border-red-400/60',
            )}
          >
            <input type="radio" name={name} value={val} checked={checked} onChange={() => onChange(val)} className="sr-only" />
            <span className={cn('grid h-4 w-4 shrink-0 place-items-center rounded-full border-2', checked ? 'border-orange-500' : 'border-slate-400 dark:border-graphite-500')} aria-hidden="true">
              {checked && <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />}
            </span>
            {render ? render(o, checked) : lbl}
          </label>
        );
      })}
    </div>
  );
}

export function Toggle({ checked, onChange, label, id, description }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-300 bg-white/60 px-4 py-3 dark:border-white/10 dark:bg-white/[0.02]">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {description && <span className="block text-xs muted">{description}</span>}
      </span>
      <span className="relative mt-0.5 shrink-0">
        <input id={id} type="checkbox" role="switch" checked={!!checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span className="block h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-gradient-to-r peer-checked:from-amber-400 peer-checked:to-orange-600 peer-focus-visible:ring-2 peer-focus-visible:ring-amber-400 dark:bg-white/15" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
        <span className="sr-only">{checked ? 'Yes' : 'No'}</span>
      </span>
    </label>
  );
}
