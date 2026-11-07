import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Search, Package, Timer, FlaskConical, SearchX, Beaker } from 'lucide-react';
import { Page, PageHeader, Select, EmptyState } from '../components/ui';
import DataTable from '../components/DataTable';
import { TEST_CATALOG, PACKAGES, testById } from '../data/testCatalog';
import { PRODUCTS, productName } from '../data/plantUnits';
import { SPECS } from '../data/specs';
import { fmtMoney, fmtHours, estimate } from '../lib/utils';

const short = { crude: 'Crude', naphtha: 'Naphtha', gasoline: 'Gasoline', jet: 'Jet', diesel: 'Diesel', fueloil: 'Fuel oil', lube: 'Lube', lpg: 'LPG', natgas: 'Nat. gas', polymer: 'Polymer', catalyst: 'Catalyst', water: 'Water', other: 'Other' };

export default function TestCatalog() {
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [tat, setTat] = useState('all');

  const rows = useMemo(() => {
    const s = q.toLowerCase();
    return TEST_CATALOG.filter(
      (t) =>
        (type === 'all' || t.types.includes(type)) &&
        (tat === 'all' || (tat === 'fast' ? t.tat <= 4 : tat === 'day' ? t.tat <= 24 : t.tat > 24)) &&
        (!s || `${t.name} ${t.method} ${t.notes} ${t.instrument}`.toLowerCase().includes(s)),
    );
  }, [q, type, tat]);

  const columns = [
    { key: 'name', header: 'Analysis', render: (t) => (<div><div className="font-medium">{t.name}</div><div className="text-[11px] muted">{t.instrument}</div></div>) },
    { key: 'method', header: 'Method', render: (t) => <span className="whitespace-nowrap font-mono text-xs font-semibold text-orange-700 dark:text-amber-300">{t.method}</span> },
    { key: 'types', header: 'Sample types', sortable: false, render: (t) => <div className="flex max-w-[220px] flex-wrap gap-1">{t.types.map((x) => <span key={x} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium dark:bg-white/5">{short[x]}</span>)}</div> },
    { key: 'minVol', header: 'Min. volume', render: (t) => <span className="whitespace-nowrap font-mono text-xs">{t.minVol}</span> },
    { key: 'container', header: 'Container', render: (t) => <span className="text-xs">{t.container}</span> },
    { key: 'tat', header: 'Turnaround', sortValue: (t) => t.tat, render: (t) => <span className="whitespace-nowrap font-mono text-xs">{fmtHours(t.tat)}</span> },
    { key: 'price', header: 'Price', sortValue: (t) => t.price, className: 'text-right', render: (t) => <span className="font-mono text-sm font-semibold">{fmtMoney(t.price)}</span> },
    { key: 'notes', header: 'Notes', sortable: false, render: (t) => <span className="block max-w-[280px] text-xs muted">{t.notes}</span> },
  ];

  return (
    <Page>
      <PageHeader
        icon={BookOpen}
        eyebrow="Test catalog"
        title="Analyses & Methods"
        subtitle={`${TEST_CATALOG.length} accredited methods with sample requirements, turnaround and pricing. Prices are per sample, before priority surcharge.`}
        actions={<Link to="/new" className="btn-primary"><FlaskConical className="h-4 w-4" aria-hidden="true" /> Request analysis</Link>}
      />

      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <Package className="h-5 w-5 text-orange-500" aria-hidden="true" /> Test packages
      </h2>
      <div className="mb-8 flex snap-x gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {PACKAGES.map((p, i) => {
          const e = estimate(p.tests, 1, 'Routine');
          return (
            <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="glass glass-hover w-64 shrink-0 snap-start p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-orange-700 dark:text-amber-300">{productName(p.product)}</div>
              <div className="mt-0.5 font-display font-semibold leading-tight">{p.name}</div>
              <div className="mt-1 text-xs muted">vs {SPECS[p.spec].short}</div>
              <div className="mt-3 flex flex-wrap gap-1">
                {p.tests.map((t) => <span key={t} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[9.5px] dark:bg-white/5">{testById(t).method.replace('ASTM ', '')}</span>)}
              </div>
              <div className="mt-3 flex items-center justify-between font-mono text-xs">
                <span className="font-semibold">{fmtMoney(e.base)}</span>
                <span className="muted"><Timer className="mr-0.5 inline h-3 w-3" aria-hidden="true" />{fmtHours(e.maxTat)}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="glass mb-4 grid gap-2 p-3 sm:grid-cols-[1fr_auto_auto] sm:p-4">
        <label className="relative">
          <span className="sr-only">Search catalog</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 muted" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: sulfur, D445, viscosity, GC…" className="input pl-9" />
        </label>
        <Select id="cat-type" label="Sample type" value={type} onChange={setType} options={[{ value: 'all', label: 'All sample types' }, ...PRODUCTS.filter((p) => p.id !== 'other').map((p) => ({ value: p.id, label: p.name }))]} />
        <Select id="cat-tat" label="Turnaround" value={tat} onChange={setTat} options={[{ value: 'all', label: 'Any turnaround' }, { value: 'fast', label: '≤ 4 hours' }, { value: 'day', label: '≤ 24 hours' }, { value: 'long', label: '> 24 hours' }]} />
      </div>

      {!rows.length ? (
        <div className="glass">
          <EmptyState icon={SearchX} title="No analyses match" message="Try a method number (e.g. D86) or clear the filters." action={<button className="btn-ghost" onClick={() => { setQ(''); setType('all'); setTat('all'); }}>Clear filters</button>} />
        </div>
      ) : (
        <>
          <div className="glass hidden overflow-hidden md:block">
            <DataTable columns={columns} rows={rows} caption="Test catalog" />
          </div>
          <div className="grid gap-3 md:hidden">
            {rows.map((t) => (
              <div key={t.id} className="glass p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="font-mono text-xs font-semibold text-orange-700 dark:text-amber-300">{t.method}</div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="font-semibold">{fmtMoney(t.price)}</div>
                    <div className="text-xs muted">{fmtHours(t.tat)}</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs muted">
                  <Beaker className="h-3.5 w-3.5" aria-hidden="true" /> {t.minVol} · {t.container}
                </div>
                <p className="mt-1 text-xs muted">{t.notes}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </Page>
  );
}
