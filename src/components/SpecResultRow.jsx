import { FlagBadge } from './StatusBadge';
import { cn, fmtValue } from '../lib/utils';

const fmtLim = (v, testId) => (v === undefined ? '—' : fmtValue(v, testId));

/** One row of the results table: test, method, result, unit, spec min/max, flag. */
export default function SpecResultRow({ row, index = 0 }) {
  const { test, limit, value, flag, testId } = row;
  const bad = flag === 'FAIL' || flag === 'OFF-SPEC';
  return (
    <tr
      className={cn(
        'transition-colors',
        flag === 'FAIL' && 'bg-red-500/[0.06]',
        flag === 'OFF-SPEC' && 'bg-amber-500/[0.07]',
      )}
      style={{ animation: `fadeRow .4s ${index * 0.04}s both` }}
    >
      <td className="border-b border-slate-100 px-3 py-2.5 dark:border-white/5">
        <div className="flex items-center gap-2">
          {bad && <span className={cn('h-6 w-1 rounded-full', flag === 'FAIL' ? 'bg-red-500' : 'bg-amber-500')} aria-hidden="true" />}
          <span className="font-medium">{test?.name ?? testId}</span>
        </div>
      </td>
      <td className="border-b border-slate-100 px-3 py-2.5 font-mono text-xs muted dark:border-white/5">{test?.method}</td>
      <td className={cn('border-b border-slate-100 px-3 py-2.5 text-right font-mono font-semibold tabular-nums dark:border-white/5', flag === 'FAIL' && 'text-red-600 dark:text-red-400', flag === 'OFF-SPEC' && 'text-amber-700 dark:text-amber-300')}>
        {fmtValue(value, testId)}
      </td>
      <td className="border-b border-slate-100 px-3 py-2.5 font-mono text-xs muted dark:border-white/5">{test?.unit || '—'}</td>
      <td className="border-b border-slate-100 px-3 py-2.5 text-right font-mono text-xs tabular-nums dark:border-white/5">{fmtLim(limit?.min, testId)}</td>
      <td className="border-b border-slate-100 px-3 py-2.5 text-right font-mono text-xs tabular-nums dark:border-white/5">{fmtLim(limit?.max, testId)}</td>
      <td className="border-b border-slate-100 px-3 py-2.5 dark:border-white/5">
        <FlagBadge flag={flag} />
      </td>
    </tr>
  );
}

export function ResultsTable({ rows }) {
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <style>{'@keyframes fadeRow{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}'}</style>
      <table className="w-full min-w-[680px] text-sm">
        <caption className="sr-only">Analysis results compared to specification limits</caption>
        <thead>
          <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-graphite-400">
            <th scope="col" className="border-b border-slate-200 px-3 py-2 dark:border-white/10">Test</th>
            <th scope="col" className="border-b border-slate-200 px-3 py-2 dark:border-white/10">Method</th>
            <th scope="col" className="border-b border-slate-200 px-3 py-2 text-right dark:border-white/10">Result</th>
            <th scope="col" className="border-b border-slate-200 px-3 py-2 dark:border-white/10">Unit</th>
            <th scope="col" className="border-b border-slate-200 px-3 py-2 text-right dark:border-white/10">Spec min</th>
            <th scope="col" className="border-b border-slate-200 px-3 py-2 text-right dark:border-white/10">Spec max</th>
            <th scope="col" className="border-b border-slate-200 px-3 py-2 dark:border-white/10">Flag</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <SpecResultRow key={r.testId} row={r} index={i} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
