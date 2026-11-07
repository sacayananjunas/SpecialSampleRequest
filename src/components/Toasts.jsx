import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';

const TONES = {
  success: [CheckCircle2, 'text-emerald-500', 'from-emerald-400 to-emerald-600'],
  error: [XCircle, 'text-red-500', 'from-red-400 to-red-600'],
  warning: [AlertTriangle, 'text-amber-500', 'from-amber-300 to-orange-500'],
  info: [Info, 'text-sky-500', 'from-sky-400 to-sky-600'],
};

export default function Toasts() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:right-6 lg:left-auto lg:items-end no-print" aria-live="polite" aria-atomic="false">
      <AnimatePresence>
        {toasts.map((t) => {
          const [Icon, color, bar] = TONES[t.tone] ?? TONES.info;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
              className="glass pointer-events-auto relative w-full max-w-sm overflow-hidden !bg-white/95 p-4 pr-10 dark:!bg-graphite-850/95"
              role={t.tone === 'error' ? 'alert' : 'status'}
            >
              <div className={cn('absolute inset-y-0 left-0 w-1 bg-gradient-to-b', bar)} aria-hidden="true" />
              <div className="flex gap-3">
                <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', color)} aria-hidden="true" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{t.title}</div>
                  {t.message && <div className="mt-0.5 text-xs muted">{t.message}</div>}
                  {t.action && (
                    <button className="mt-2 text-xs font-semibold text-orange-700 hover:underline dark:text-amber-300" onClick={() => { t.action.onClick(); dismissToast(t.id); }}>
                      {t.action.label}
                    </button>
                  )}
                </div>
              </div>
              <button onClick={() => dismissToast(t.id)} className="absolute right-2 top-2 rounded-md p-1 muted hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Dismiss notification">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
