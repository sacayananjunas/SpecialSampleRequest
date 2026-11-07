import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ListChecks, Search, LayoutGrid, Table2, FilePlus2, SlidersHorizontal, X, SearchX, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Page, PageHeader, EmptyState, Select, Countdown } from '../components/ui';
import DataTable from '../components/DataTable';
import Timeline from '../components/Timeline';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { PRODUCTS, PROCESS_UNITS, PRIORITIES, productName, unitName } from '../data/plantUnits';
import { STATUSES, fmtDate, relTime, verdict, cn, statusIndex } from '../lib/utils';

export function VerdictPill({ req }) {
  const vd = verdict(req);
  if (req.status !== 'certified' && req.status !== 'qc') return null;
  if (vd.onSpec)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> On spec
      </span>
    );
  if (vd.failed)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
        <XCircle className="h-3.5 w-3.5" aria-hidden="true" /> Off spec ({vd.failed})
      </span>
    );
  return null;
}

export default function MyRequests() {
  const { requests, role, roleId } = useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [status, setStatus] = useState(params.get('status') ?? 'all');
  const [priority, setPriority] = useState('all');
  const [product, setProduct] = useState('all');
  const [unit, setUnit] = useState('all');
  const isRequester = roleId === 'requester';
  const [onlyMine, setMine] = useState(false);
  const mine = isRequester || onlyMine; // requesters only ever receive their own requests from the API
  const [view, setView] = useState('table');

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return requests.filter((r) => {
      if (onlyMine && r.requesterId !== role.user.id) return false;
      if (status !== 'all' && r.status !== status) return false;
      if (priority !== 'all' && r.priority !== priority) return false;
      if (product !== 'all' && r.product !== product) return false;
      if (unit !== 'all' && r.unit !== unit) return false;
      if (s && !`${r.id} ${productName(r.product)} ${r.point} ${r.packageName} ${r.requester.name} ${r.batch}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [requests, q, status, priority, product, unit, onlyMine, role]);

  const counts = useMemo(() => {
    const base = onlyMine ? requests.filter((r) => r.requesterId === role.user.id) : requests;
    return Object.fromEntries(STATUSES.map((s) => [s.id, base.filter((r) => r.status === s.id).length]));
  }, [requests, onlyMine, role]);

  const active = [q, status !== 'all', priority !== 'all', product !== 'all', unit !== 'all'].filter(Boolean).length;
  const clear = () => {
    setQ('');
    setStatus('all');
    setPriority('all');
    setProduct('all');
    setUnit('all');
    setParams({});
  };

  const columns = [
    { key: 'id', header: 'Sample ID', render: (r) => <span className="font-mono font-semibold text-slate-900 dark:text-white">{r.id}</span> },
    { key: 'product', header: 'Product', sortValue: (r) => productName(r.product), render: (r) => <span className="font-medium">{productName(r.product)}</span> },
    { key: 'point', header: 'Unit / tank', render: (r) => (<div><div className="text-xs muted">{unitName(r.unit)}</div><div className="font-mono text-xs">{r.point}</div></div>) },
    { key: 'packageName', header: 'Test package', render: (r) => <span className="text-xs">{r.packageName}</span> },
    { key: 'priority', header: 'Priority', sortValue: (r) => PRIORITIES.indexOf(r.priority), render: (r) => <PriorityBadge priority={r.priority} /> },
    {
      key: 'status',
      header: 'Status',
      sortValue: (r) => statusIndex(r.status),
      render: (r) => (
        <div className="space-y-1">
          <StatusBadge status={r.status} />
          <div className="flex items-center gap-2">
            <VerdictPill req={r} />
            {r.status !== 'certified' && <Countdown to={r.dueAt} />}
            {r.issues?.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> Issue
              </span>
            )}
          </div>
        </div>
      ),
    },
    { key: 'progress', header: 'Progress', sortable: false, className: 'w-40', render: (r) => <Timeline status={r.status} compact /> },
    { key: 'createdAt', header: 'Submitted', render: (r) => (<div><div className="text-xs">{fmtDate(r.createdAt)}</div><div className="text-[11px] muted">{relTime(r.createdAt)}</div></div>) },
  ];

  const empty = (
    <EmptyState
      icon={requests.length ? SearchX : ListChecks}
      title={active ? 'No requests match these filters' : mine ? "You haven't submitted any requests yet" : 'No requests yet'}
      message={active ? 'Try a different search term or clear the filters.' : 'Submit your first sample and track it here, from sampling point to certified result.'}
      action={active ? <button className="btn-ghost" onClick={clear}>Clear filters</button> : <Link to="/new" className="btn-primary">Submit a Sample Request</Link>}
    />
  );

  return (
    <Page>
      <PageHeader
        icon={ListChecks}
        eyebrow={mine ? 'My requests' : 'All requests'}
        title={mine ? 'My Requests' : 'Sample Requests'}
        subtitle="Search, filter and follow every sample from submission to certified Certificate of Analysis."
        actions={<Link to="/new" className="btn-primary"><FilePlus2 className="h-4 w-4" aria-hidden="true" /> New request</Link>}
      />

      {/* Status chips */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-thin" role="group" aria-label="Filter by status">
        {[{ id: 'all', label: 'All' }, ...STATUSES].map((s) => {
          const n = s.id === 'all' ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[s.id];
          return (
            <button key={s.id} onClick={() => setStatus(s.id)} aria-pressed={status === s.id} className={cn('chip shrink-0 px-3 py-1.5 text-sm transition', status === s.id ? 'border-orange-500 bg-gradient-to-r from-amber-400/20 to-orange-600/10 text-slate-900 dark:text-white' : 'border-slate-300 muted hover:border-amber-400/60 dark:border-white/10')}>
              {s.label}
              <span className="rounded-full bg-slate-200 px-1.5 font-mono text-[10px] text-slate-700 dark:bg-white/10 dark:text-graphite-200">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="glass mb-4 p-3 sm:p-4">
        <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto_auto] md:items-center">
          <label className="relative">
            <span className="sr-only">Search requests</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 muted" aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sample ID, product, tank, batch…" className="input pl-9" />
          </label>
          <Select id="f-priority" label="Priority" value={priority} onChange={setPriority} options={[{ value: 'all', label: 'All priorities' }, ...PRIORITIES.map((p) => ({ value: p, label: p }))]} />
          <Select id="f-product" label="Product type" value={product} onChange={setProduct} options={[{ value: 'all', label: 'All products' }, ...PRODUCTS.map((p) => ({ value: p.id, label: p.name }))]} />
          <Select id="f-unit" label="Plant unit" value={unit} onChange={setUnit} options={[{ value: 'all', label: 'All units' }, ...PROCESS_UNITS.map((u) => ({ value: u.id, label: u.name }))]} />
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-300 p-1 dark:border-white/10" role="group" aria-label="View">
              <button onClick={() => setView('table')} aria-pressed={view === 'table'} className={cn('rounded-lg p-2', view === 'table' ? 'bg-amber-400/20 text-orange-700 dark:text-amber-300' : 'muted')} aria-label="Table view"><Table2 className="h-4 w-4" /></button>
              <button onClick={() => setView('cards')} aria-pressed={view === 'cards'} className={cn('rounded-lg p-2', view === 'cards' ? 'bg-amber-400/20 text-orange-700 dark:text-amber-300' : 'muted')} aria-label="Card view"><LayoutGrid className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          {isRequester ? <span className="muted">Showing requests submitted from your account</span> : <label className="inline-flex min-h-[32px] cursor-pointer items-center gap-2">
            <input type="checkbox" checked={onlyMine} onChange={(e) => setMine(e.target.checked)} className="h-4 w-4 accent-orange-500" />
            Only requests by <span className="font-semibold">{role.user.name}</span>
          </label>}
          <div className="flex items-center gap-3 muted">
            <span><SlidersHorizontal className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />{rows.length} of {requests.length} requests</span>
            {active > 0 && (
              <button onClick={clear} className="inline-flex items-center gap-1 font-semibold text-orange-700 hover:underline dark:text-amber-300">
                <X className="h-3.5 w-3.5" aria-hidden="true" /> Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      {!rows.length ? (
        <div className="glass">{empty}</div>
      ) : (
        <>
          {view === 'table' && (
            <div className="glass hidden overflow-hidden md:block">
              <DataTable columns={columns} rows={rows} onRowClick={(r) => navigate(`/requests/${r.id}`)} caption="Sample requests" initialSort={{ key: 'createdAt', dir: 'desc' }} rowClassName={(r) => r.priority === 'Critical' && r.status !== 'certified' && 'bg-red-500/[0.04]'} />
            </div>
          )}
          <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-3', view === 'table' && 'md:hidden')}>
            {[...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }}>
                <Link to={`/requests/${r.id}`} className="glass glass-hover block p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono font-semibold">{r.id}</div>
                      <div className="text-sm">{productName(r.product)}</div>
                      <div className="font-mono text-xs muted">{unitName(r.unit)} · {r.point}</div>
                    </div>
                    <PriorityBadge priority={r.priority} />
                  </div>
                  <div className="mt-2 text-xs muted">{r.packageName}</div>
                  <Timeline status={r.status} compact className="mt-4" />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge status={r.status} />
                    {r.status === 'certified' ? <VerdictPill req={r} /> : <Countdown to={r.dueAt} />}
                  </div>
                  <div className="mt-2 text-[11px] muted">Submitted {fmtDate(r.createdAt)} · {r.requester.name}</div>
                </Link>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </Page>
  );
}
