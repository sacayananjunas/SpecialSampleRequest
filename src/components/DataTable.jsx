import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Generic sortable table.
 * columns: [{ key, header, render?(row), sortValue?(row), className?, sortable? }]
 */
export default function DataTable({ columns, rows, onRowClick, rowKey = 'id', empty, caption, initialSort, rowClassName }) {
  const [sort, setSort] = useState(initialSort ?? null); // { key, dir }
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    const get = col?.sortValue ?? ((r) => r[sort.key]);
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      const res = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va ?? '').localeCompare(String(vb ?? ''));
      return sort.dir === 'asc' ? res : -res;
    });
  }, [rows, sort, columns]);

  const toggle = (key) => setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  if (!rows.length && empty) return empty;

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={cn('sticky top-0 border-b border-slate-200 bg-slate-50/90 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur dark:border-white/10 dark:bg-graphite-900/90 dark:text-graphite-400', c.className)}
                >
                  {c.sortable === false ? (
                    c.header
                  ) : (
                    <button className="inline-flex items-center gap-1 hover:text-orange-600 dark:hover:text-amber-300" onClick={() => toggle(c.key)}>
                      {c.header}
                      {active ? sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                    </button>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr
              key={r[rowKey]}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              onKeyDown={onRowClick ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onRowClick(r)) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              className={cn(
                'group transition-colors',
                onRowClick && 'cursor-pointer hover:bg-amber-50/70 focus:bg-amber-50/70 dark:hover:bg-white/[0.03] dark:focus:bg-white/[0.04]',
                rowClassName?.(r),
              )}
            >
              {columns.map((c) => (
                <td key={c.key} className={cn('border-b border-slate-100 px-3 py-3 align-middle dark:border-white/5', c.className)}>
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
